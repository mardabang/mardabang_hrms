package com.mardabang.hrms.user.photo;
import java.io.*;
import java.util.Map;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.service.UserService;

@RestController @RequestMapping("/api/me/profile-photo") @RequiredArgsConstructor
public class AccountPhotoController {
    private final AccountPhotoService photos;
    private final UserService users;
    private Long owner(Authentication auth) {
        User user=users.getUserByPrincipal(auth.getName()).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"Account not found."));
        if(!Boolean.TRUE.equals(user.getActive()) || (user.getRole()!=Role.ADMIN && user.getRole()!=Role.INPUTER)) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Photo upload is available for admins and supervisors.");
        return user.getId();
    }
    @GetMapping public ResponseEntity<byte[]> get(Authentication auth) {
        byte[] image=photos.load(owner(auth));
        return image==null?ResponseEntity.noContent().build():ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG).body(image);
    }
    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String,String> upload(@RequestParam("photo") MultipartFile file,Authentication auth) throws IOException {
        Long id=owner(auth);
        byte[] image=validatePhoto(file);
        photos.save(id,image);
        return Map.of("message","Profile photo saved.");
    }
    static byte[] validatePhoto(MultipartFile file) throws IOException {
        if(file.isEmpty() || file.getSize()>2*1024*1024) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a JPG or PNG photo up to 2 MB.");
        try(InputStream input=file.getInputStream();ImageInputStream stream=ImageIO.createImageInputStream(input)) {
            var readers=ImageIO.getImageReaders(stream);
            if(!readers.hasNext()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a valid JPG or PNG image.");
            ImageReader reader=readers.next();
            try {
                if(!reader.getFormatName().equalsIgnoreCase("JPEG") && !reader.getFormatName().equalsIgnoreCase("PNG")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a JPG or PNG photo.");
                reader.setInput(stream);
                if(reader.getWidth(0)>4096 || reader.getHeight(0)>4096) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Photo dimensions must be 4096 pixels or less.");
                var decoded=reader.read(0);
                int width=decoded.getWidth(),height=decoded.getHeight();
                double scale=Math.min(1.0,512.0/Math.max(width,height));
                var resized=new java.awt.image.BufferedImage(Math.max(1,(int)(width*scale)),Math.max(1,(int)(height*scale)),java.awt.image.BufferedImage.TYPE_INT_ARGB);
                var graphics=resized.createGraphics();
                try {graphics.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);graphics.drawImage(decoded,0,0,resized.getWidth(),resized.getHeight(),null);} finally {graphics.dispose();}
                var output=new ByteArrayOutputStream();ImageIO.write(resized,"PNG",output);return output.toByteArray();
            } finally {reader.dispose();}
        } catch(javax.imageio.IIOException failure) {throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The image could not be read. Choose another photo.");}
    }
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> invalid(ResponseStatusException failure) {return ResponseEntity.status(failure.getStatusCode()).body(Map.of("message",failure.getReason()));}
}
