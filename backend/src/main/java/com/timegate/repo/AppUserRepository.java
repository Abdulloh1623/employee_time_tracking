package com.timegate.repo;

import com.timegate.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByLogin(String login);
    Optional<AppUser> findFirstByEmployeeId(Long employeeId);
    List<AppUser> findByRole_Name(String roleName);
}
