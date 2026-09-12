package com.mardabang.hrms.firms.service;

import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FirmServiceImpl implements FirmService {

    private final FirmRepository repository;

    public FirmServiceImpl(FirmRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<Firm> getAllFirms() {
        return repository.findAll();
    }

    @Override
    public Firm getFirmById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Firm not found"));
    }

    @Override
    public Firm createFirm(Firm firm) {

        if (repository.existsByCode(firm.getCode())) {
            throw new RuntimeException("Firm code already exists");
        }

        return repository.save(firm);
    }

    @Override
    public Firm updateFirm(Long id, Firm updatedFirm) {

        Firm firm = getFirmById(id);

        firm.setCode(updatedFirm.getCode());
        firm.setName(updatedFirm.getName());
        firm.setActive(updatedFirm.getActive());

        return repository.save(firm);
    }

    @Override
    public void deleteFirm(Long id) {

        Firm firm = getFirmById(id);

        repository.delete(firm);
    }
}