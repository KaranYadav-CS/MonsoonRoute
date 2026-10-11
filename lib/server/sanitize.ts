import 'server-only';
import sharp from 'sharp';
export async function sanitizePhoto(original:Buffer){
 if(!original.length||original.length>3145728)throw Error('IMAGE_SIZE_INVALID');
 const image=sharp(original,{limitInputPixels:4000000,failOn:'error'}),meta=await image.metadata();
 if(!['jpeg','png','webp'].includes(meta.format||'')||!meta.width||!meta.height||meta.width*meta.height>4000000||(meta.pages??1)>1)throw Error('IMAGE_FORMAT_INVALID');
 for(const dimension of [1600,1200,800])for(const quality of [85,75,65]){
  const clean=await sharp(original,{limitInputPixels:4000000,failOn:'error'}).rotate().resize(dimension,dimension,{fit:'inside',withoutEnlargement:true}).removeAlpha().jpeg({quality,mozjpeg:true}).toBuffer();
  if(clean.length<=524288)return clean;
 }
 throw Error('PROCESSED_IMAGE_TOO_LARGE');
}
