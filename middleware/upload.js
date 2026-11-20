// Multer holds a small image in memory until it passes a content-signature check.
const multer=require('multer');const path=require('path');const fs=require('fs');const crypto=require('crypto');
const folder=path.join(__dirname,'..','public','uploads');fs.mkdirSync(folder,{recursive:true});
const acceptedTypes=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1},fileFilter:(req,file,cb)=>acceptedTypes.has(file.mimetype)?cb(null,true):cb(Object.assign(new Error('Choose a JPG, PNG, WebP, or GIF image.'),{code:'INVALID_IMAGE_TYPE'}))});
function detectImage(buffer){
  if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpg';
  if(buffer.length>=6&&['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6)))return 'gif';
  if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';
  return null;
}
exports.single=upload.single('image');
exports.persistValidatedImage=async(req,res,next)=>{
  if(!req.file)return next();
  try{const extension=detectImage(req.file.buffer);if(!extension)return next(Object.assign(new Error('The uploaded file is not a supported image.'),{code:'INVALID_IMAGE_TYPE'}));const filename=`${crypto.randomUUID()}.${extension}`;await fs.promises.writeFile(path.join(folder,filename),req.file.buffer,{flag:'wx'});req.file.filename=filename;next();}catch(error){next(error);}
};
