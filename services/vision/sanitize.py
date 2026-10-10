"""Re-encode image to remove EXIF/metadata, cap size/dimensions; never execute media."""
import io
from PIL import Image,ImageOps,UnidentifiedImageError
MAX_ORIGINAL=3145728
MAX_PIXELS=4096*4096
class InvalidImage(ValueError):pass
def sanitize_image(blob:bytes)->bytes:
    if not blob or len(blob)>MAX_ORIGINAL:raise InvalidImage('IMAGE_SIZE_INVALID')
    try:
        with Image.open(io.BytesIO(blob)) as img:
            if img.format not in {'JPEG','PNG','WEBP'}:raise InvalidImage('IMAGE_FORMAT_INVALID')
            if img.width*img.height>MAX_PIXELS:raise InvalidImage('IMAGE_DIMENSIONS_UNSUPPORTED')
            img=ImageOps.exif_transpose(img)
            if img.mode not in {'RGB','L'}:img=img.convert('RGB')
            else:img=img.copy()
            out=io.BytesIO();img.save(out,format='JPEG',quality=86,optimize=True)
            if out.tell()>MAX_ORIGINAL:raise InvalidImage('SANITIZED_IMAGE_TOO_LARGE')
            return out.getvalue()
    except (OSError,ValueError,UnidentifiedImageError) as e:
        if isinstance(e,InvalidImage):raise
        raise InvalidImage('IMAGE_DECODING_FAILED') from e
