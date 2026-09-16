package com.mardabang.hrms.user.photo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
@Component @RequiredArgsConstructor
public class AccountPhotoMigration implements ApplicationRunner {
    private final AccountPhotoRepository photos;
    private final AccountPhotoService service;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Override public void run(ApplicationArguments args) {
        Integer required=jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='account_profile_photos' AND column_name='image' AND is_nullable='NO'",Integer.class);
        if(required!=null && required>0)jdbc.execute("ALTER TABLE account_profile_photos MODIFY COLUMN image LONGBLOB NULL");
        for(AccountPhoto photo:photos.findAll())if(photo.getImageKey()==null && photo.getImage()!=null)service.migrate(photo.getUserId());
    }
}
