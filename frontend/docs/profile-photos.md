# Profile photo storage

Employee, admin and supervisor photos use `EmployeeDocumentStorage` and the folder configured by `app.employee-documents.path`. Files receive unique names; account photos use an `account-{userId}` prefix. The folder is not a public static directory: photos are served through authenticated APIs.

The `account_profile_photos` table now stores file references for admin and supervisor photos. On backend restart, the migration moves existing photo bytes into files and clears the legacy bytes after saving each reference. The nullable legacy column remains for migration compatibility. Employee photo references remain on employee records.

The account endpoint remains `/api/me/profile-photo`, so the current upload layout needs no frontend changes. It accepts JPG and PNG up to 2 MB, validates and resizes the image, then uses the shared employee storage service. The previous account photo is deleted only after the replacement transaction commits; rollback removes the new file.

Back up both the database and the configured upload folder. Keep the folder on persistent storage when deploying containers or moving the backend to another computer.

Restart the backend in Eclipse and refresh My Profile. Live migration against the office MySQL database still requires verification after restart.
