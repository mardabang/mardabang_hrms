package com.mardabang.hrms.user.photo;

import java.io.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import com.mardabang.hrms.employee.service.EmployeeDocumentStorage;

@Service @RequiredArgsConstructor
public class AccountPhotoService {
    private final AccountPhotoRepository photos;
    private final EmployeeDocumentStorage storage;

    @Transactional public void save(Long userId, byte[] png) {
        AccountPhoto photo=photos.findById(userId).orElseGet(AccountPhoto::new);
        photo.setUserId(userId);
        persist(photo,png);
    }
    @Transactional public byte[] load(Long userId) {
        AccountPhoto photo=photos.findById(userId).orElse(null);
        if(photo==null)return null;
        if(photo.getImageKey()==null && photo.getImage()!=null)persist(photo,photo.getImage());
        return photo.getImageKey()==null ? null : storage.load(photo.getImageKey());
    }
    @Transactional public void migrate(Long userId) {
        AccountPhoto photo=photos.findById(userId).orElse(null);
        if(photo!=null && photo.getImageKey()==null && photo.getImage()!=null)persist(photo,photo.getImage());
    }
    private void persist(AccountPhoto photo,byte[] png) {
        String oldKey=photo.getImageKey();
        var stored=storage.storeImage(new PngUpload(png),"account-"+photo.getUserId());
        // Database rollback must retain the previous photo and remove only the new file.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit(){storage.deleteQuietly(oldKey);}
            @Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)storage.deleteQuietly(stored.key());}
        });
        photo.setImageKey(stored.key());photo.setOriginalName(stored.originalName());photo.setImage(null);
        photos.saveAndFlush(photo);
    }
    private record PngUpload(byte[] content) implements MultipartFile {
        public String getName(){return "photo";}
        public String getOriginalFilename(){return "profile.png";}
        public String getContentType(){return "image/png";}
        public boolean isEmpty(){return content.length==0;}
        public long getSize(){return content.length;}
        public byte[] getBytes(){return content;}
        public InputStream getInputStream(){return new ByteArrayInputStream(content);}
        public void transferTo(File target) throws IOException {java.nio.file.Files.write(target.toPath(),content);}
    }
}
