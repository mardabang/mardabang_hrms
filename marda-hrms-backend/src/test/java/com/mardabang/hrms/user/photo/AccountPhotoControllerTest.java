package com.mardabang.hrms.user.photo;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.user.service.UserService;
class AccountPhotoControllerTest {
    @Test void rejectsNonImageEvenWithImageMimeType() {
        assertThrows(ResponseStatusException.class,()->AccountPhotoController.validatePhoto(new MockMultipartFile("photo","fake.png","image/png","not an image".getBytes())));
    }
    @Test void rejectsOversizeUpload() {
        assertThrows(ResponseStatusException.class,()->AccountPhotoController.validatePhoto(new MockMultipartFile("photo","photo.png","image/png",new byte[2*1024*1024+1])));
    }
    @Test void resizesPhotoAndStoresPng() throws Exception {
        var original=new BufferedImage(1000,500,BufferedImage.TYPE_INT_RGB);
        var bytes=new ByteArrayOutputStream();ImageIO.write(original,"JPEG",bytes);
        byte[] result=AccountPhotoController.validatePhoto(new MockMultipartFile("photo","photo.jpg","image/jpeg",bytes.toByteArray()));
        var saved=ImageIO.read(new java.io.ByteArrayInputStream(result));
        assertEquals(512,saved.getWidth());assertEquals(256,saved.getHeight());assertEquals((byte)137,result[0]);
    }
    @Test void employeesCannotAccessAccountPhotoApi() {
        var repo=mock(AccountPhotoService.class);var users=mock(UserService.class);
        when(users.getUserByPrincipal("employee")).thenReturn(Optional.of(User.builder().id(4L).role(Role.EMPLOYEE).active(true).build()));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->new AccountPhotoController(repo,users).get(new UsernamePasswordAuthenticationToken("employee",""))).getStatusCode().value());verifyNoInteractions(repo);
    }
    @Test void loadsAuthenticatedSupervisorsOwnPhoto() {
        var repo=mock(AccountPhotoService.class);var users=mock(UserService.class);
        when(users.getUserByPrincipal("phone")).thenReturn(Optional.of(User.builder().id(7L).role(Role.INPUTER).active(true).build()));
        when(repo.load(7L)).thenReturn(null);
        assertEquals(204,new AccountPhotoController(repo,users).get(new UsernamePasswordAuthenticationToken("phone","")).getStatusCode().value());verify(repo).load(7L);
    }
}
