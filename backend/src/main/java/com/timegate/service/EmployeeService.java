package com.timegate.service;

import com.timegate.common.ApiException;
import com.timegate.common.PageResponse;
import com.timegate.domain.Employee;
import com.timegate.dto.EmployeeDtos.*;
import com.timegate.repo.EmployeeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Map;

@Service
public class EmployeeService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

    private final EmployeeRepository repo;
    private final AuditService audit;

    public EmployeeService(EmployeeRepository repo, AuditService audit) {
        this.repo = repo;
        this.audit = audit;
    }

    private static final java.util.Set<String> SORTABLE =
        java.util.Set.of("id", "firstName", "lastName", "hireDate", "status");

    @Transactional(readOnly = true)
    public PageResponse<EmployeeDto> list(Long departmentId, String status, String q,
                                          String sortBy, String sortDir, int page, int perPage) {
        String field = (sortBy != null && SORTABLE.contains(sortBy)) ? sortBy : "id";
        Sort.Direction dir = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), perPage, Sort.by(dir, field));

        final Long deptId = departmentId;
        final String st = (status == null || status.isBlank()) ? null : status;
        final String query = (q == null || q.isBlank()) ? null : q.trim().toLowerCase();

        Specification<Employee> spec = (root, cq, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (deptId != null) predicates.add(cb.equal(root.get("departmentId"), deptId));
            if (st != null) predicates.add(cb.equal(root.get("status"), st));
            if (query != null) {
                String like = "%" + query + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("firstName")), like),
                    cb.like(cb.lower(root.get("lastName")), like)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Employee> result = repo.findAll(spec, pageable);
        return PageResponse.from(result, EmployeeDto::from);
    }

    @Transactional(readOnly = true)
    public EmployeeDto get(Long id) {
        return EmployeeDto.from(find(id));
    }

    @Transactional
    public EmployeeDto create(EmployeeCreate req) {
        Employee e = new Employee();
        apply(e, req);
        e.setStatus("active");
        e = repo.save(e);
        // generate a simple QR token based on the new id
        e.setQrToken("TGV-emp" + String.format("%03d", e.getId()));
        e = repo.save(e);
        audit.record("EMPLOYEE_CREATE", "employee", e.getId(),
            Map.of("name", e.getLastName() + " " + e.getFirstName()));
        return EmployeeDto.from(e);
    }

    @Transactional
    public EmployeeDto update(Long id, EmployeeCreate req) {
        Employee e = find(id);
        apply(e, req);
        e = repo.save(e);
        audit.record("EMPLOYEE_UPDATE", "employee", id,
            Map.of("name", e.getLastName() + " " + e.getFirstName()));
        return EmployeeDto.from(e);
    }

    @Transactional
    public void deactivate(Long id) {
        Employee e = find(id);
        e.setStatus("inactive");
        repo.save(e);
        audit.record("EMPLOYEE_DEACTIVATE", "employee", id, null);
    }

    @Transactional
    public EmployeeDto activate(Long id) {
        Employee e = find(id);
        e.setStatus("active");
        e = repo.save(e);
        audit.record("EMPLOYEE_ACTIVATE", "employee", id, null);
        return EmployeeDto.from(e);
    }

    /** Replace the employee's QR token with a new, unpredictable one (invalidates the old QR). */
    @Transactional
    public EmployeeDto regenerateQr(Long id) {
        Employee e = find(id);
        e.setQrToken(newUniqueToken(id));
        e = repo.save(e);
        audit.record("EMPLOYEE_QR_REGENERATE", "employee", id, null);
        return EmployeeDto.from(e);
    }

    private String newUniqueToken(Long id) {
        String token;
        do {
            token = "TGV-" + id + "-" + randomSuffix(8);
        } while (repo.findByQrToken(token).isPresent());
        return token;
    }

    private static String randomSuffix(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    private Employee find(Long id) {
        return repo.findById(id).orElseThrow(() -> ApiException.notFound("Employee not found: " + id));
    }

    private void apply(Employee e, EmployeeCreate r) {
        e.setFirstName(r.firstName());
        e.setLastName(r.lastName());
        e.setMiddleName(r.middleName());
        e.setDepartmentId(r.departmentId());
        e.setPositionId(r.positionId());
        e.setEmploymentType(r.employmentType());
        e.setPayrollModel(r.payrollModel());
        e.setPhone(r.phone());
        e.setEmail(r.email());
        e.setHireDate(r.hireDate());
    }
}
