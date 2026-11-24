export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'expo-sqlite') {
    return {
      format: 'module',
      shortCircuit: true,
      url: new URL('./mockExpoSqlite.mjs', import.meta.url).href,
    };
  }
  return nextResolve(specifier, context);
}
