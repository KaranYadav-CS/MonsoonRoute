begin;
insert into public.cities(id,name,supported_bbox) values
 ('delhi-central','Central Delhi',gis.st_makeenvelope(77.190,28.600,77.245,28.655,4326));
insert into public.data_sources(id,name,source_url,license,limitations) values
 ('osm','OpenStreetMap','https://www.openstreetmap.org/copyright','ODbL 1.0',
  array['Contributor data may be incomplete','Pilot excludes unsupported restrictions']),
 ('copernicus-dem','Copernicus DEM GLO-30','https://registry.opendata.aws/copernicus-dem/',
  'Copernicus DEM terms; retain exact linked license in source manifest',
  array['Surface elevation, not roadway water depth','Bridge/tunnel uncertainty']),
 ('delhi-traffic-police','Delhi Traffic Police June 2025 newsletter',
  'https://traffic.delhipolice.gov.in/sites/default/files/uploads/2025/NEWSLETTER-JUNE-25.pdf',
  'Official publication; extract reviewed location facts with source attribution; no blanket redistribution claim',
  array['No complete geocoded 57-location label set']),
 ('open-meteo-forecast','Open-Meteo forecast','https://open-meteo.com/en/docs','CC BY 4.0 + API usage terms',
  array['Numerical model precipitation, not street sensors','Issuance metadata may be absent']),
 ('open-meteo-archive','Open-Meteo historical weather','https://open-meteo.com/en/docs/historical-weather-api',
  'CC BY 4.0 + API usage terms',array['Reanalysis does not prove road flooding']),
 ('hf-flood-classifier','Hugging Face flood photo classifier',
  'https://huggingface.co/prithivMLmods/Flood-Image-Detection','Apache-2.0 model tag; archive card/license',
  array['Author performance not independently verified','Training-data linkage uncertainty']);
commit;
