# 📱 Multi-Device & `scrcpy` Setup Guide for System Presentation

This guide outlines how to connect, mirror, and operate physical Android phones alongside an emulator for a seamless, zero-lag live demonstration of **EvacRoute**.

---

## 🎯 Recommended Presentation Architecture

| Screen / Device | Role in Demo | Why Assigned Here |
| :--- | :--- | :--- |
| **Physical Phone 1** (`scrcpy`) | **Rescuer Unit (Field Navigation)** | Native hardware GPU acceleration eliminates touch lag; 10m/s simulation navigation and 1-click roadblock rerouting respond instantly. |
| **Physical Phone 2** (`scrcpy`) | **Shelter Staff (QR Scanner)** | Real camera lens ensures instant, 1-second QR barcode focusing and evacuee check-in. |
| **Android Emulator** | **Resident SOS App** | Lightweight (only triggers SOS and views distress status); does not burden host laptop CPU. |
| **Laptop Display / Projector** | **CDRRMO EOC Web Dashboard** | Full-screen live incident map, unit dispatching, and proactive hazard placement. |

---

## ⚙️ 1. Physical Phone Preparation (One-Time Setup)

Perform these steps on each physical phone before connecting:

1. **Enable Developer Options**:
   - Open **Settings** > **About Phone**.
   - Tap **Build Number** 7 times until a toast says *"You are now a developer!"*.
2. **Enable USB Debugging**:
   - Go to **Settings** > **System** > **Developer Options**.
   - Toggle **USB Debugging** to **ON**.
   - *(Optional but Recommended)*: Toggle **Stay Awake** (screen won't sleep while charging).
3. **Connect via USB & Authorize**:
   - Plug phone into the laptop via USB cable.
   - When the prompt appears: **"Allow USB Debugging from this computer?"**:
     - Check the box **"Always allow from this computer"**.
     - Tap **Allow / OK**.

---

## 🔍 2. Identifying Connected Devices

Open a terminal and run:

```bash
adb devices -l
```

### Example Output:
```text
List of devices attached
emulator-5554          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64
RFCW10ABCDE            device usb:1-1 product:a52sxq model:SM_A528B (Samsung Galaxy A52s)
ZY3224WXYZ             device usb:1-2 product:sparrow model:Redmi_Note_11 (Redmi Note 11)
```

Notice each device has a unique **Serial ID** (the first column).

---

## 🚀 3. Launching `scrcpy` Without Conflicts

### Scenario A: One Physical Phone + One Emulator
If you only have **one** physical phone plugged in (Rescuer) and **one** emulator (Resident), tell `scrcpy` to target the USB device directly:

```bash
scrcpy -d --window-title="Rescuer Unit (Field)" --stay-awake --video-bit-rate=8M
```
> `-d` instructs `scrcpy` to exclusively connect to the physical USB device, ignoring the running emulator.

---

### Scenario B: Two Physical Phones + One Emulator (Recommended)
When both the Rescuer Phone and Scanner Phone are plugged into your laptop's USB ports, use their serial IDs with `-s`:

#### Terminal 1 — Rescuer Unit:
```bash
scrcpy -s RFCW10ABCDE \
  --window-title="🚨 RESCUER UNIT (ALPHA)" \
  --stay-awake \
  --video-bit-rate=8M \
  --max-fps=60
```

#### Terminal 2 — Evacuation Center Scanner:
```bash
scrcpy -s ZY3224WXYZ \
  --window-title="📷 SHELTER SCANNER" \
  --stay-awake \
  --video-bit-rate=8M \
  --max-fps=60
```

> [!TIP]
> Both windows will float on your desktop side-by-side. You can resize them and arrange them next to your DRRM web browser so the panel can see all three systems interacting in real time!

---

## ⚡ 4. Recommended `scrcpy` Power Flags

| Flag | Purpose |
| :--- | :--- |
| `--stay-awake` | Keeps the phone screen on continuously during the presentation. |
| `--video-bit-rate=8M` | Reduces USB bus overhead while maintaining crystal-clear 1080p stream. |
| `--max-fps=60` | Caps stream to 60 FPS for ultra-smooth Mapbox navigation. |
| `--window-title="Name"` | Sets a clear window title so evaluators know which role each window represents. |
| `--window-x 0 --window-y 0` | Positions the window at specific pixel coordinates on your screen. |
| `--power-off-on-close` | Turns off the physical phone screen when you close `scrcpy`. |

---

## 📶 5. Optional: Wireless `scrcpy` (Untethered Walk-Around Demo)

If you want to hold the phone and walk up to the panel while it still mirrors on the projector screen:

1. Connect the phone with USB first. Ensure laptop and phone are on the **same Wi-Fi / Hotspot**.
2. Run:
   ```bash
   adb -s RFCW10ABCDE tcpip 5555
   ```
3. Find your phone's Wi-Fi IP in **Settings > About Phone > Status Information > IP address** (e.g. `192.168.1.45`).
4. Disconnect the USB cable.
5. Connect wirelessly:
   ```bash
   adb connect 192.168.1.45:5555
   scrcpy -s 192.168.1.45:5555 --window-title="Rescuer Unit (Wireless)"
   ```

---

## 🎬 6. End-to-End Presentation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Resident as Resident (Emulator)
    actor DRRM as DRRM EOC (Web Browser)
    actor Rescuer as Rescuer Unit (Phone 1 via scrcpy)
    actor Shelter as Shelter Scanner (Phone 2 via scrcpy)

    Resident->>DRRM: 1. Submits Critical SOS (Mendoza Family, Baliwasan)
    DRRM->>Rescuer: 2. Dispatches Boat/Truck Alpha with live telemetry
    Rescuer->>Rescuer: 3. Accepts Dispatch & En Route (10m/s simulation moves on map)
    DRRM->>Rescuer: 4. DRRM marks dynamic Flood Hazard / Rescuer drops Roadblock
    Rescuer->>Rescuer: 5. Map recalculates dynamic detour around blocked path
    Rescuer->>Rescuer: 6. 20m Geofence arrival: Secures victims & switches to Shelter route
    Rescuer->>Shelter: 7. Transports evacuees to Baliwasan Gym
    Shelter->>DRRM: 8. Scans QR Badge; logs headcount & verifies shelter capacity
```

---

## 🛠️ Quick Troubleshooting Checklist

- **Problem**: `scrcpy: error: Device unauthorized`
  - **Fix**: Check phone screen, unlock it, and tap **"Always Allow"** on the USB debugging authorization pop-up.
- **Problem**: Phone disconnected / ADB not seeing it
  - **Fix**:
    ```bash
    adb kill-server && adb start-server
    adb devices
    ```
- **Problem**: Rescuer screen turns black when idle
  - **Fix**: Launch `scrcpy` with `--stay-awake`.
