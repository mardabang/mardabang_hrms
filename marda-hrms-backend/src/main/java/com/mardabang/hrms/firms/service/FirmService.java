package com.mardabang.hrms.firms.service;

import com.mardabang.hrms.firms.entity.Firm;

import java.util.List;

public interface FirmService {

    List<Firm> getAllFirms();

    Firm getFirmById(Long id);

    Firm createFirm(Firm firm);

    Firm updateFirm(Long id, Firm firm);

    void deleteFirm(Long id);
}