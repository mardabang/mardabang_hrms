package com.mardabang.hrms.user.photo;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name="account_profile_photos") @Getter @Setter
public class AccountPhoto {
    @Id private Long userId;
    // Nullable legacy bytes are cleared after migration to file storage.
    @Column private String imageKey;
    @Column private String originalName;
    @Lob @Column(columnDefinition="LONGBLOB") private byte[] image;
}
