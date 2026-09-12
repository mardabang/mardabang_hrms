package com.mardabang.hrms.employee.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EmployeeDocumentStorage {

    private static final long MAX_PDF_SIZE = 5L * 1024 * 1024;
    private final Path storageRoot;

    public EmployeeDocumentStorage(@Value("${app.employee-documents.path}") String storagePath) {
        this.storageRoot = Path.of(storagePath).toAbsolutePath().normalize();
    }

    public StoredDocument store(MultipartFile file, String employeeCode, String documentType) {
        validatePdf(file, documentType);
        String safeCode = employeeCode.replaceAll("[^A-Za-z0-9-]", "_");
        String key = safeCode + "-" + documentType + "-" + UUID.randomUUID() + ".pdf";
        Path target = resolveKey(key);

        try {
            Files.createDirectories(storageRoot);
            Files.write(target, file.getBytes(), StandardOpenOption.CREATE_NEW);
            return new StoredDocument(key, safeOriginalName(file.getOriginalFilename()));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store the " + documentType + " PDF.", ex);
        }
    }

    public StoredDocument storeImage(MultipartFile file, String employeeCode) {
        validateImage(file);
        String safeCode = employeeCode.replaceAll("[^A-Za-z0-9-]", "_");
        String extension = detectImageExtension(file);
        String key = safeCode + "-photo-" + UUID.randomUUID() + extension;
        Path target = resolveKey(key);

        try {
            Files.createDirectories(storageRoot);
            Files.write(target, file.getBytes(), StandardOpenOption.CREATE_NEW);
            return new StoredDocument(key, safeOriginalName(file.getOriginalFilename()));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store the employee photo.", ex);
        }
    }

    public byte[] load(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Document not found.");
        }
        try {
            return Files.readAllBytes(resolveKey(key));
        } catch (IOException ex) {
            throw new IllegalArgumentException("Document not found.", ex);
        }
    }

    public void deleteQuietly(String key) {
        if (key == null || key.isBlank()) return;
        try {
            Files.deleteIfExists(resolveKey(key));
        } catch (IOException ignored) {
            // A failed cleanup must not corrupt the employee record.
        }
    }

    private void validatePdf(MultipartFile file, String documentType) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(documentType + " PDF is required.");
        }
        if (file.getSize() > MAX_PDF_SIZE) {
            throw new IllegalArgumentException(documentType + " PDF must not exceed 5 MB.");
        }
        String name = safeOriginalName(file.getOriginalFilename());
        if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new IllegalArgumentException(documentType + " document must be a PDF file.");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.equalsIgnoreCase("application/pdf")) {
            throw new IllegalArgumentException(documentType + " document must use the PDF content type.");
        }
        try {
            byte[] header = file.getInputStream().readNBytes(5);
            if (header.length != 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
                throw new IllegalArgumentException(documentType + " document is not a valid PDF.");
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("Could not read the " + documentType + " PDF.", ex);
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Employee photo is required.");
        }
        if (file.getSize() > 2L * 1024 * 1024) {
            throw new IllegalArgumentException("Employee photo must not exceed 2 MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !(contentType.equalsIgnoreCase("image/jpeg") || contentType.equalsIgnoreCase("image/png") || contentType.equalsIgnoreCase("image/webp"))) {
            throw new IllegalArgumentException("Employee photo must be a JPG, PNG, or WEBP image.");
        }
        String name = safeOriginalName(file.getOriginalFilename());
        if (!(name.toLowerCase(Locale.ROOT).endsWith(".jpg") || name.toLowerCase(Locale.ROOT).endsWith(".jpeg") || name.toLowerCase(Locale.ROOT).endsWith(".png") || name.toLowerCase(Locale.ROOT).endsWith(".webp"))) {
            throw new IllegalArgumentException("Employee photo filename must end with .jpg, .jpeg, .png, or .webp.");
        }
    }

    private String detectImageExtension(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && contentType.equalsIgnoreCase("image/png")) return ".png";
        if (contentType != null && contentType.equalsIgnoreCase("image/webp")) return ".webp";
        return ".jpg";
    }

    private String safeOriginalName(String originalName) {
        if (originalName == null || originalName.isBlank()) return "document.pdf";
        return Path.of(originalName).getFileName().toString().replaceAll("[\\r\\n]", "_");
    }

    private Path resolveKey(String key) {
        Path resolved = storageRoot.resolve(key).normalize();
        if (!resolved.startsWith(storageRoot)) {
            throw new IllegalArgumentException("Invalid document path.");
        }
        return resolved;
    }

    public record StoredDocument(String key, String originalName) {
    }
}
