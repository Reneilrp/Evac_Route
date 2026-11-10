import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cameraViewPath = path.resolve(
  __dirname,
  '..',
  'node_modules',
  'expo-camera',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'camera',
  'ExpoCameraView.kt'
);

if (!fs.existsSync(cameraViewPath)) {
  console.log('[patch-expo-camera] ExpoCameraView.kt not found, skipping.');
  process.exit(0);
}

let source = fs.readFileSync(cameraViewPath, 'utf8');
let modified = false;

// 1. Force TextureView mode (PreviewView.ImplementationMode.COMPATIBLE) to fix black preview screen on Android
const originalPreviewInit = `  private var previewView = PreviewView(context).apply {
    elevation = 0f
  }`;
const patchedPreviewInit = `  private var previewView = PreviewView(context).apply {
    elevation = 0f
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
  }`;

if (source.includes(originalPreviewInit)) {
  source = source.replace(originalPreviewInit, patchedPreviewInit);
  modified = true;
  console.log('[patch-expo-camera] Patched previewView with ImplementationMode.COMPATIBLE (TextureView).');
} else if (source.includes('implementationMode = PreviewView.ImplementationMode.COMPATIBLE')) {
  console.log('[patch-expo-camera] previewView already configured with ImplementationMode.COMPATIBLE.');
}

// 2. Fix child view measure & layout pass on surface mount
const originalBlock = `      override fun onChildViewAdded(parent: View?, child: View?) {
        parent?.measure(
          MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
          MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
        )
        parent?.layout(0, 0, parent.measuredWidth, parent.measuredHeight)
      }`;

const patchedBlock = `      override fun onChildViewAdded(parent: View?, child: View?) {
        val targetWidth = if (width > 0) width else measuredWidth
        val targetHeight = if (height > 0) height else measuredHeight
        parent?.measure(
          MeasureSpec.makeMeasureSpec(targetWidth, MeasureSpec.EXACTLY),
          MeasureSpec.makeMeasureSpec(targetHeight, MeasureSpec.EXACTLY)
        )
        parent?.layout(0, 0, targetWidth, targetHeight)
      }`;

if (source.includes(originalBlock)) {
  source = source.replace(originalBlock, patchedBlock);
  modified = true;
  console.log('[patch-expo-camera] Patched onChildViewAdded measure and layout block.');
} else if (source.includes('parent?.layout(0, 0, parent.measuredWidth, parent.measuredHeight)') && source.includes('val targetWidth = if (width > 0) width else measuredWidth')) {
  source = source.replace(
    'parent?.layout(0, 0, parent.measuredWidth, parent.measuredHeight)',
    'parent?.layout(0, 0, targetWidth, targetHeight)'
  );
  modified = true;
  console.log('[patch-expo-camera] Corrected layout call to targetWidth/targetHeight.');
}

if (modified) {
  fs.writeFileSync(cameraViewPath, source, 'utf8');
  console.log('[patch-expo-camera] ExpoCameraView.kt updated successfully.');
} else {
  console.log('[patch-expo-camera] All patches already applied.');
}
