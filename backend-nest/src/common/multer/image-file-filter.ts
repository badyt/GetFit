import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const validExt = allowed.test(extname(file.originalname).toLowerCase());
  const validMime = allowed.test(file.mimetype);

  if (validExt && validMime) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
  }
};
