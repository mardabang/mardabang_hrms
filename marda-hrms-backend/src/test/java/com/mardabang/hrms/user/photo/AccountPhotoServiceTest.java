package com.mardabang.hrms.user.photo;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.transaction.support.*;
import com.mardabang.hrms.employee.service.EmployeeDocumentStorage;
class AccountPhotoServiceTest {
    AccountPhotoRepository repo=mock(AccountPhotoRepository.class);
    EmployeeDocumentStorage storage=mock(EmployeeDocumentStorage.class);
    AccountPhotoService service=new AccountPhotoService(repo,storage);
    AccountPhoto photo=new AccountPhoto();
    byte[] png={1,2,3};
    @BeforeEach void setup() {
        photo.setUserId(7L);when(repo.findById(7L)).thenReturn(Optional.of(photo));
        when(storage.storeImage(any(),eq("account-7"))).thenReturn(new EmployeeDocumentStorage.StoredDocument("new.png","profile.png"));
        TransactionSynchronizationManager.initSynchronization();
    }
    @AfterEach void cleanup(){TransactionSynchronizationManager.clearSynchronization();}
    @Test void replacementStoresReferenceAndDeletesPreviousOnlyAfterCommit() {
        photo.setImageKey("old.png");service.save(7L,png);
        assertEquals("new.png",photo.getImageKey());assertNull(photo.getImage());verify(storage,never()).deleteQuietly(any());
        var callback=TransactionSynchronizationManager.getSynchronizations().get(0);callback.afterCommit();callback.afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage).deleteQuietly("old.png");verify(storage,never()).deleteQuietly("new.png");
    }
    @Test void rollbackDeletesNewFileAndRetainsPreviousFile() {
        photo.setImageKey("old.png");service.save(7L,png);
        TransactionSynchronizationManager.getSynchronizations().get(0).afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        verify(storage).deleteQuietly("new.png");verify(storage,never()).deleteQuietly("old.png");
    }
    @Test void migratesLegacyBytesBeforeLoading() {
        photo.setImage(png);when(storage.load("new.png")).thenReturn(png);
        assertArrayEquals(png,service.load(7L));assertNull(photo.getImage());assertEquals("new.png",photo.getImageKey());verify(repo).saveAndFlush(photo);
    }
    @Test void existingFileReferenceIsNotMigratedAgain() {
        photo.setImageKey("existing.png");service.migrate(7L);verifyNoInteractions(storage);verify(repo,never()).saveAndFlush(any());
    }
}
