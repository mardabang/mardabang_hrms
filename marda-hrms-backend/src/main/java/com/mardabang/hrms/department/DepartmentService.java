package com.mardabang.hrms.department;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.RequiredArgsConstructor;
import com.mardabang.hrms.firms.entity.Firm;
import com.mardabang.hrms.firms.repository.FirmRepository;
import com.mardabang.hrms.user.service.UserService;
import com.mardabang.hrms.user.entity.*;
import com.mardabang.hrms.employee.entity.Employee;
import com.mardabang.hrms.employee.dto.EmployeeDto;
@Service @RequiredArgsConstructor @Transactional
public class DepartmentService {
    private final DepartmentRepository departments;
    private final FirmRepository firms;
    private final UserService users;
    private final JdbcTemplate jdbc;
    public record View(Long id,Long firmId,String name,boolean active) {}
    static String normalize(String name) {
        String cleaned=name==null?"":name.trim().replaceAll("\\s+"," ");
        if(cleaned.isEmpty()||cleaned.length()>100) throw new IllegalArgumentException("Department name must contain 1–100 characters.");
        return cleaned;
    }
    static String key(String name) {return normalize(name).toLowerCase(Locale.ROOT);}
    private View view(Department d) {return new View(d.getId(),d.getFirm().getId(),d.getName(),d.isActive());}
    private Firm access(Long firmId,String principal,boolean write) {
        if(firmId==null)throw new IllegalArgumentException("Select a company.");
        User user=users.getUserByPrincipal(principal).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"Account not found."));
        if(!Boolean.TRUE.equals(user.getActive()) || write && user.getRole()!=Role.ADMIN) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Administrator access is required.");
        if(user.getRole()!=Role.ADMIN && (user.getFirms()==null||user.getFirms().stream().noneMatch(f->Objects.equals(f.getId(),firmId)))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This company is not assigned to you.");
        return firms.findById(firmId).filter(f->Boolean.TRUE.equals(f.getActive())).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Active company not found."));
    }
    @Transactional(readOnly=true) public List<View> list(Long firmId,boolean activeOnly,String principal) {
        access(firmId,principal,false);
        return departments.findByFirmIdOrderByNameAsc(firmId).stream().filter(d->!activeOnly||d.isActive()).map(this::view).toList();
    }
    public View create(Long firmId,String name,String principal) {
        Firm firm=access(firmId,principal,true);String cleaned=normalize(name);
        if(departments.findByFirmIdAndNameKey(firmId,key(cleaned)).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Department already exists in this company. Reactivate it if needed.");
        Department d=new Department();d.setFirm(firm);d.setName(cleaned);d.setNameKey(key(cleaned));
        return view(departments.saveAndFlush(d));
    }
    public View update(Long id,String name,Boolean active,String principal) {
        Department d=departments.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Department not found."));
        access(d.getFirm().getId(),principal,true);
        if(name!=null) {
            String cleaned=normalize(name);
            departments.findByFirmIdAndNameKey(d.getFirm().getId(),key(cleaned)).filter(other->!other.getId().equals(id)).ifPresent(other->{throw new ResponseStatusException(HttpStatus.CONFLICT,"Department already exists in this company.");});
            d.setName(cleaned);d.setNameKey(key(cleaned));
            // Keep legacy exports and employee queries consistent; attendance snapshots stay unchanged.
            jdbc.update("UPDATE employees SET department=? WHERE department_id=?",cleaned,id);
        }
        if(active!=null)d.setActive(active);
        return view(departments.saveAndFlush(d));
    }
    public Department resolve(EmployeeDto dto,Employee existing) {
        Long firmId=dto.getFirmId()!=null?dto.getFirmId():existing==null?null:existing.getFirmId();
        if(firmId==null)throw new IllegalArgumentException("A company is required to assign a department.");
        Department d=dto.getDepartmentId()!=null?departments.findById(dto.getDepartmentId()).orElse(null):departments.findByFirmIdAndNameKey(firmId,key(dto.getDepartment())).orElse(null);
        if(d==null||!Objects.equals(d.getFirm().getId(),firmId))throw new IllegalArgumentException("Select a department belonging to the employee's company.");
        boolean unchanged=existing!=null && existing.getDepartmentRecord()!=null && Objects.equals(existing.getDepartmentRecord().getId(),d.getId()) && Objects.equals(existing.getFirmId(),firmId);
        if(!d.isActive()&&!unchanged)throw new IllegalArgumentException("Select an active department.");
        dto.setDepartment(d.getName());dto.setDepartmentId(d.getId());return d;
    }
}
