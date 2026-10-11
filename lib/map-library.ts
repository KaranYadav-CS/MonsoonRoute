export async function loadMapLibrary(){
 const lib=await import('maplibre-gl');
 lib.setWorkerUrl('/vendor/maplibre/6.14.0/maplibre-gl-worker.mjs');
 return lib;
}
