package com.timegate.security;

import com.timegate.domain.AppUser;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;

public class CustomUserDetails implements UserDetails {

    private final AppUser user;
    private final Collection<GrantedAuthority> authorities;

    public CustomUserDetails(AppUser user) {
        this.user = user;
        this.authorities = new ArrayList<>();
        if (user.getRole() != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName()));
            user.getRole().getPermissions().forEach(pr ->
                authorities.add(new SimpleGrantedAuthority(pr.getCode())));
        }
    }

    public AppUser getUser() { return user; }
    public Long getId() { return user.getId(); }
    public Long getEmployeeId() { return user.getEmployeeId(); }
    public String getRoleName() { return user.getRole() != null ? user.getRole().getName() : null; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return user.getPasswordHash(); }
    @Override public String getUsername() { return user.getLogin(); }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return !"blocked".equals(user.getStatus()); }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return "active".equals(user.getStatus()); }
}
