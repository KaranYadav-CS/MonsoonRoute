"""Re-encode image to remove EXIF/metadata, cap size/dimensions; never execute media."""
import io
from PIL import Image,ImageOps,UnidentifiedImageError
MAX_ORIGINAL=3145728
MAX_PIXELS=4000000
class InvalidImage(ValueError):pass
def sanitize_image(blob:bytes)->bytes:
    if not blob or len(blob)>MAX_ORIGINAL:raise InvalidImage('IMAGE_SIZE_INVALID')
    try:
        with Image.open(io.BytesIO(blob)) as img:
            if img.format not in {'JPEG','PNG','WEBP'}:raise InvalidImage('IMAGE_FORMAT_INVALID')
            if img.width*img.height>MAX_PIXELS or getattr(img,'n_frames',1)>1:raise InvalidImage('IMAGE_DIMENSIONS_UNSUPPORTED')
            img=ImageOps.exif_transpose(img)
            if img.mode not in {'RGB','L'}:img=img.convert('RGB')
            else:img=img.copy()
            for dimension in (1600,1200,800):
                copy=img.copy();copy.thumbnail((dimension,dimension))
                for quality in (85,75,65):
                    out=io.BytesIO();copy.save(out,format='JPEG',quality=quality,optimize=True)
                    if out.tell()<=524288:return out.getvalue()
            raise InvalidImage('SANITIZED_IMAGE_TOO_LARGE')
    except (OSError,ValueError,UnidentifiedImageError) as e:
        if isinstance(e,InvalidImage):raise
        raise InvalidImage('IMAGE_DECODING_FAILED') from e
