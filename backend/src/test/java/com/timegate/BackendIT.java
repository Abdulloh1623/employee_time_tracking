package com.timegate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests over the full Spring context + a real PostgreSQL.
 *
 * Database selection:
 *  - If env TG_IT_DB_URL is set, tests run against that external Postgres (used locally).
 *  - Otherwise a Testcontainers PostgreSQL is started automatically (used in CI).
 *
 * Each test is @Transactional and rolls back, so the Flyway-seeded data stays intact.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BackendIT {

    static PostgreSQLContainer<?> postgres;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        String externalUrl = System.getenv("TG_IT_DB_URL");
        if (externalUrl != null && !externalUrl.isBlank()) {
            registry.add("spring.datasource.url", () -> externalUrl);
            registry.add("spring.datasource.username",
                () -> System.getenv().getOrDefault("TG_IT_DB_USER", "timegate"));
            registry.add("spring.datasource.password",
                () -> System.getenv().getOrDefault("TG_IT_DB_PASSWORD", "timegate"));
        } else {
            if (postgres == null) {
                postgres = new PostgreSQLContainer<>("postgres:16-alpine");
                postgres.start();
            }
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String token(String login, String password) throws Exception {
        MvcResult res = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"" + login + "\",\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk()).andReturn();
        return om.readTree(res.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String bearer(String t) { return "Bearer " + t; }

    // ---------------- Auth ----------------
    @Test
    void login_succeeds_for_admin() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"admin\",\"password\":\"admin123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.user.role").value("super_admin"));
    }

    @Test
    void login_fails_with_wrong_password() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"admin\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized());
    }

    // ---------------- Employees / security ----------------
    @Test
    void employees_require_authentication() throws Exception {
        mvc.perform(get("/api/v1/employees")).andExpect(status().isUnauthorized());
    }

    @Test
    void employees_list_returns_seeded_data() throws Exception {
        String t = token("admin", "admin123");
        mvc.perform(get("/api/v1/employees").header("Authorization", bearer(t)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.data.length()").value(3));
    }

    // ---------------- Attendance ----------------
    @Test
    void attendance_scan_check_in_then_duplicate_conflict() throws Exception {
        String t = token("admin", "admin123");
        mvc.perform(post("/api/v1/attendance/scan").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qrToken\":\"TGV-emp001\",\"deviceId\":\"junit\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.eventType").value("in"));

        mvc.perform(post("/api/v1/attendance/scan").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qrToken\":\"TGV-emp001\",\"deviceId\":\"junit\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("duplicate_scan"));
    }

    // ---------------- Payroll engine ----------------
    @Test
    void payroll_calculate_and_idempotent_manual_adjustment() throws Exception {
        String t = token("admin", "admin123");

        MvcResult pr = mvc.perform(post("/api/v1/payroll/periods").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"T\",\"startDate\":\"2026-06-01\",\"endDate\":\"2026-06-30\"}"))
            .andExpect(status().isCreated()).andReturn();
        long periodId = om.readTree(pr.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(post("/api/v1/payroll/periods/" + periodId + "/calculate").header("Authorization", bearer(t)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.employees").value(3));

        MvcResult list = mvc.perform(get("/api/v1/payrolls").param("periodId", String.valueOf(periodId))
                .header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        JsonNode rows = om.readTree(list.getResponse().getContentAsString());
        JsonNode emp2 = null;
        for (JsonNode r : rows) if (r.get("employeeId").asLong() == 2L) emp2 = r;
        assertThat(emp2).isNotNull();
        assertThat(emp2.get("gross").asDouble()).isEqualTo(5_000_000d);
        assertThat(emp2.get("totalBonus").asDouble()).isEqualTo(200_000d);
        assertThat(emp2.get("net").asDouble()).isEqualTo(5_200_000d);

        long payrollId = emp2.get("id").asLong();

        mvc.perform(post("/api/v1/payrolls/" + payrollId + "/adjustments").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"fine\",\"amount\":100000,\"reason\":\"test\"}"))
            .andExpect(status().isCreated());

        // recalculate: manual fine must survive, bonus not doubled
        mvc.perform(post("/api/v1/payroll/periods/" + periodId + "/calculate").header("Authorization", bearer(t)))
            .andExpect(status().isOk());

        MvcResult slip = mvc.perform(get("/api/v1/payrolls/" + payrollId).header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        JsonNode payroll = om.readTree(slip.getResponse().getContentAsString()).get("payroll");
        assertThat(payroll.get("totalBonus").asDouble()).isEqualTo(200_000d);
        assertThat(payroll.get("totalFine").asDouble()).isEqualTo(100_000d);
        assertThat(payroll.get("net").asDouble()).isEqualTo(5_100_000d);
    }

    // ---------------- Leave workflow ----------------
    @Test
    void leave_create_approve_updates_balance() throws Exception {
        String t = token("admin", "admin123");

        MvcResult cr = mvc.perform(post("/api/v1/leave-requests").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeId\":2,\"leaveTypeId\":1,\"dateFrom\":\"2026-07-01\",\"dateTo\":\"2026-07-10\",\"reason\":\"x\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.days").value(10))
            .andExpect(jsonPath("$.status").value("pending"))
            .andReturn();
        long reqId = om.readTree(cr.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(post("/api/v1/leave-requests/" + reqId + "/decision").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"approved\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("approved"));

        MvcResult bal = mvc.perform(get("/api/v1/employees/2/leave-balances").header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        JsonNode arr = om.readTree(bal.getResponse().getContentAsString());
        assertThat(arr).isNotEmpty();
        JsonNode annual = null;
        for (JsonNode b : arr) if (b.get("leaveTypeId").asLong() == 1L) annual = b;
        assertThat(annual).isNotNull();
        assertThat(annual.get("usedDays").asDouble()).isEqualTo(10d);
        assertThat(annual.get("remainingDays").asDouble()).isEqualTo(11d);
    }

    // ---------------- Pay-rate windowing & salary raise ----------------
    private JsonNode payRates(String t, long empId) throws Exception {
        MvcResult r = mvc.perform(get("/api/v1/employees/" + empId + "/pay-rates").header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        return om.readTree(r.getResponse().getContentAsString());
    }
    private long openRateCount(JsonNode rates) {
        long n = 0;
        for (JsonNode r : rates) if (r.get("validTo").isNull()) n++;
        return n;
    }
    private JsonNode rateByValidFrom(JsonNode rates, String validFrom) {
        for (JsonNode r : rates) if (validFrom.equals(r.get("validFrom").asText())) return r;
        return null;
    }

    @Test
    void payRate_future_closes_previous_and_same_date_updates_in_place() throws Exception {
        String t = token("admin", "admin123");
        int n0 = payRates(t, 2).size();

        // Add a future rate -> previous open rate is closed, new open rate created
        mvc.perform(post("/api/v1/employees/2/pay-rates").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"model\":\"fixed_monthly\",\"monthlySalary\":6000000,\"currency\":\"UZS\",\"validFrom\":\"2030-01-01\"}"))
            .andExpect(status().isCreated());

        JsonNode after1 = payRates(t, 2);
        assertThat(after1.size()).isEqualTo(n0 + 1);
        assertThat(openRateCount(after1)).isEqualTo(1);
        assertThat(rateByValidFrom(after1, "2030-01-01").get("validTo").isNull()).isTrue();

        // Same validFrom again -> update in place (no duplicate), value replaced
        mvc.perform(post("/api/v1/employees/2/pay-rates").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"model\":\"fixed_monthly\",\"monthlySalary\":7000000,\"currency\":\"UZS\",\"validFrom\":\"2030-01-01\"}"))
            .andExpect(status().isCreated());

        JsonNode after2 = payRates(t, 2);
        assertThat(after2.size()).isEqualTo(n0 + 1);                 // unchanged -> no duplicate
        assertThat(rateByValidFrom(after2, "2030-01-01").get("monthlySalary").asDouble()).isEqualTo(7_000_000d);
    }

    @Test
    void payRate_backdating_is_rejected() throws Exception {
        String t = token("admin", "admin123");
        mvc.perform(post("/api/v1/employees/2/pay-rates").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"model\":\"fixed_monthly\",\"monthlySalary\":1000000,\"currency\":\"UZS\",\"validFrom\":\"2000-01-01\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("rate_backdating"));
    }

    @Test
    void salary_raise_preview_and_apply() throws Exception {
        String t = token("admin", "admin123");

        MvcResult prev = mvc.perform(post("/api/v1/employees/2/pay-rates/raise/preview").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"percent\",\"value\":10,\"effectiveFrom\":\"2030-02-01\"}"))
            .andExpect(status().isOk()).andReturn();
        JsonNode pv = om.readTree(prev.getResponse().getContentAsString());
        assertThat(pv.get("field").asText()).isEqualTo("monthlySalary");
        assertThat(pv.get("currentValue").asDouble()).isEqualTo(5_000_000d);
        assertThat(pv.get("newValue").asDouble()).isEqualTo(5_500_000d);

        mvc.perform(post("/api/v1/employees/2/pay-rates/raise").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"percent\",\"value\":10,\"effectiveFrom\":\"2030-02-01\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.monthlySalary").value(5_500_000d))
            .andExpect(jsonPath("$.validTo").doesNotExist());

        JsonNode rates = payRates(t, 2);
        assertThat(openRateCount(rates)).isEqualTo(1);
        assertThat(rateByValidFrom(rates, "2030-02-01").get("monthlySalary").asDouble()).isEqualTo(5_500_000d);
    }

    @Test
    void undo_raise_reopens_previous_rate() throws Exception {
        String t = token("admin", "admin123");
        int n0 = payRates(t, 2).size();

        mvc.perform(post("/api/v1/employees/2/pay-rates/raise").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"amount\",\"value\":500000,\"effectiveFrom\":\"2030-03-01\"}"))
            .andExpect(status().isCreated());
        assertThat(payRates(t, 2).size()).isEqualTo(n0 + 1);

        mvc.perform(delete("/api/v1/employees/2/pay-rates/current").header("Authorization", bearer(t)))
            .andExpect(status().isNoContent());

        JsonNode after = payRates(t, 2);
        assertThat(after.size()).isEqualTo(n0);                       // raise removed
        assertThat(rateByValidFrom(after, "2030-03-01")).isNull();
        assertThat(openRateCount(after)).isEqualTo(1);                // previous rate reopened
    }

    // ---------------- Period & adjustment CRUD ----------------
    private long createPeriod(String t, String name, String start, String end) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/payroll/periods").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\",\"startDate\":\"" + start + "\",\"endDate\":\"" + end + "\"}"))
            .andExpect(status().isCreated()).andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void period_update_and_overlap_conflict() throws Exception {
        String t = token("admin", "admin123");
        long a = createPeriod(t, "A", "2031-01-01", "2031-01-31");
        long b = createPeriod(t, "B", "2031-03-01", "2031-03-31");

        // happy update (rename + move to February, no overlap)
        mvc.perform(put("/api/v1/payroll/periods/" + a).header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"A2\",\"startDate\":\"2031-02-01\",\"endDate\":\"2031-02-28\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("A2"));

        // overlap with B -> 409
        mvc.perform(put("/api/v1/payroll/periods/" + a).header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"A2\",\"startDate\":\"2031-03-10\",\"endDate\":\"2031-03-20\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("period_overlap"));

        assertThat(b).isPositive();
    }

    @Test
    void adjustment_update_recomputes_net_and_protects_auto() throws Exception {
        String t = token("admin", "admin123");
        long periodId = createPeriod(t, "ADJ", "2032-06-01", "2032-06-30");
        mvc.perform(post("/api/v1/payroll/periods/" + periodId + "/calculate").header("Authorization", bearer(t)))
            .andExpect(status().isOk());

        MvcResult list = mvc.perform(get("/api/v1/payrolls").param("periodId", String.valueOf(periodId))
                .header("Authorization", bearer(t))).andExpect(status().isOk()).andReturn();
        JsonNode rows = om.readTree(list.getResponse().getContentAsString());
        long payrollId = 0, autoAdjId = 0;
        for (JsonNode r : rows) if (r.get("employeeId").asLong() == 2L) payrollId = r.get("id").asLong();
        assertThat(payrollId).isPositive();

        // add a manual fine, then edit it
        MvcResult add = mvc.perform(post("/api/v1/payrolls/" + payrollId + "/adjustments").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"fine\",\"amount\":100000,\"reason\":\"x\"}"))
            .andExpect(status().isCreated()).andReturn();
        long adjId = om.readTree(add.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/v1/payrolls/" + payrollId + "/adjustments/" + adjId).header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"fine\",\"amount\":50000,\"reason\":\"x2\"}"))
            .andExpect(status().isOk());

        MvcResult slip = mvc.perform(get("/api/v1/payrolls/" + payrollId).header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        JsonNode slipNode = om.readTree(slip.getResponse().getContentAsString());
        JsonNode payroll = slipNode.get("payroll");
        // gross 5,000,000 + bonus 200,000 - fine 50,000 = 5,150,000
        assertThat(payroll.get("totalFine").asDouble()).isEqualTo(50_000d);
        assertThat(payroll.get("net").asDouble()).isEqualTo(5_150_000d);

        // editing an auto (rule-based) adjustment must be rejected
        for (JsonNode adj : slipNode.get("adjustments")) {
            if (!adj.get("ruleId").isNull()) { autoAdjId = adj.get("id").asLong(); break; }
        }
        if (autoAdjId > 0) {
            mvc.perform(put("/api/v1/payrolls/" + payrollId + "/adjustments/" + autoAdjId).header("Authorization", bearer(t))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"type\":\"bonus\",\"amount\":1,\"reason\":\"hack\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("auto_adjustment"));
        }
    }

    // ---------------- Organization & calendar CRUD ----------------
    @Test
    void department_crud_and_in_use_guard() throws Exception {
        String t = token("admin", "admin123");
        MvcResult cr = mvc.perform(post("/api/v1/departments").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"QA\"}"))
            .andExpect(status().isCreated()).andReturn();
        long id = om.readTree(cr.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/v1/departments/" + id).header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"QA-2\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("QA-2"));

        mvc.perform(delete("/api/v1/departments/" + id).header("Authorization", bearer(t)))
            .andExpect(status().isNoContent());

        // seeded dept 1 has employees -> cannot delete
        mvc.perform(delete("/api/v1/departments/1").header("Authorization", bearer(t)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("in_use"));
    }

    @Test
    void position_in_use_guard_and_delete_unused() throws Exception {
        String t = token("admin", "admin123");
        // position 1 is used by an employee
        mvc.perform(delete("/api/v1/positions/1").header("Authorization", bearer(t)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("in_use"));
        // position 4 (Department Manager) is unused -> deletable
        mvc.perform(delete("/api/v1/positions/4").header("Authorization", bearer(t)))
            .andExpect(status().isNoContent());
    }

    @Test
    void leave_type_crud_and_in_use_guard() throws Exception {
        String t = token("admin", "admin123");
        MvcResult cr = mvc.perform(post("/api/v1/leave-types").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Study\",\"isPaid\":true,\"defaultDays\":5}"))
            .andExpect(status().isCreated()).andReturn();
        long id = om.readTree(cr.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/v1/leave-types/" + id).header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Study\",\"isPaid\":false,\"defaultDays\":3}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.isPaid").value(false));

        mvc.perform(delete("/api/v1/leave-types/" + id).header("Authorization", bearer(t)))
            .andExpect(status().isNoContent());

        // make type 1 in-use via a leave request, then deletion must be blocked
        mvc.perform(post("/api/v1/leave-requests").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeId\":2,\"leaveTypeId\":1,\"dateFrom\":\"2027-01-01\",\"dateTo\":\"2027-01-03\"}"))
            .andExpect(status().isCreated());
        mvc.perform(delete("/api/v1/leave-types/1").header("Authorization", bearer(t)))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("in_use"));
    }

    @Test
    void holiday_crud_and_duplicate_guard() throws Exception {
        String t = token("admin", "admin123");
        MvcResult cr = mvc.perform(post("/api/v1/holidays").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\":\"2026-09-01\",\"dayType\":\"holiday\",\"description\":\"Independence Day\"}"))
            .andExpect(status().isCreated()).andReturn();
        long id = om.readTree(cr.getResponse().getContentAsString()).get("id").asLong();

        // duplicate date -> 409
        mvc.perform(post("/api/v1/holidays").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\":\"2026-09-01\",\"dayType\":\"holiday\",\"description\":\"dup\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("duplicate_date"));

        // invalid day type -> 400
        mvc.perform(post("/api/v1/holidays").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\":\"2026-09-02\",\"dayType\":\"bogus\"}"))
            .andExpect(status().isBadRequest());

        // list by year contains it
        MvcResult list = mvc.perform(get("/api/v1/holidays").param("year", "2026").header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        assertThat(list.getResponse().getContentAsString()).contains("2026-09-01");

        mvc.perform(put("/api/v1/holidays/" + id).header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\":\"2026-09-01\",\"dayType\":\"holiday\",\"description\":\"Mustaqillik\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.description").value("Mustaqillik"));

        mvc.perform(delete("/api/v1/holidays/" + id).header("Authorization", bearer(t)))
            .andExpect(status().isNoContent());
    }

    // ---------------- Payroll engine: tax & holiday rules ----------------
    @Test
    void payroll_income_tax_deduction() throws Exception {
        String t = token("admin", "admin123");
        mvc.perform(post("/api/v1/payroll/rules").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"INPS 12%\",\"type\":\"deduction\",\"trigger\":\"income_tax\",\"amountType\":\"percent\",\"amountValue\":12,\"isActive\":true}"))
            .andExpect(status().isCreated());

        long periodId = createPeriod(t, "TAX", "2033-01-01", "2033-01-31");
        mvc.perform(post("/api/v1/payroll/periods/" + periodId + "/calculate").header("Authorization", bearer(t)))
            .andExpect(status().isOk());

        MvcResult list = mvc.perform(get("/api/v1/payrolls").param("periodId", String.valueOf(periodId))
                .header("Authorization", bearer(t))).andExpect(status().isOk()).andReturn();
        JsonNode rows = om.readTree(list.getResponse().getContentAsString());
        JsonNode emp2 = null;
        for (JsonNode r : rows) if (r.get("employeeId").asLong() == 2L) emp2 = r;
        assertThat(emp2).isNotNull();
        // gross 5,000,000 ; income tax 12% = 600,000 deduction ; seeded zero-lateness bonus 200,000 ; net = 4,600,000
        assertThat(emp2.get("gross").asDouble()).isEqualTo(5_000_000d);
        assertThat(emp2.get("totalDeduction").asDouble()).isEqualTo(600_000d);
        assertThat(emp2.get("net").asDouble()).isEqualTo(4_600_000d);
    }

    @Test
    void payroll_holiday_bonus_for_worked_holiday() throws Exception {
        String t = token("admin", "admin123");
        // emp1 checks in on 2033-06-15
        mvc.perform(post("/api/v1/attendance/scan").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qrToken\":\"TGV-emp001\",\"deviceId\":\"junit\",\"scannedAt\":\"2033-06-15T09:00:00+05:00\"}"))
            .andExpect(status().isCreated());
        // that date is a holiday
        mvc.perform(post("/api/v1/holidays").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"date\":\"2033-06-15\",\"dayType\":\"holiday\",\"description\":\"Test holiday\"}"))
            .andExpect(status().isCreated());
        // holiday-work bonus rule
        mvc.perform(post("/api/v1/payroll/rules").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"HolidayWorkBonus\",\"type\":\"bonus\",\"trigger\":\"holiday\",\"amountType\":\"fixed\",\"amountValue\":100000,\"isActive\":true}"))
            .andExpect(status().isCreated());

        long periodId = createPeriod(t, "HOL", "2033-06-01", "2033-06-30");
        mvc.perform(post("/api/v1/payroll/periods/" + periodId + "/calculate").header("Authorization", bearer(t)))
            .andExpect(status().isOk());

        MvcResult list = mvc.perform(get("/api/v1/payrolls").param("periodId", String.valueOf(periodId))
                .header("Authorization", bearer(t))).andExpect(status().isOk()).andReturn();
        JsonNode rows = om.readTree(list.getResponse().getContentAsString());
        long payrollId = 0;
        for (JsonNode r : rows) if (r.get("employeeId").asLong() == 1L) payrollId = r.get("id").asLong();
        assertThat(payrollId).isPositive();

        MvcResult slip = mvc.perform(get("/api/v1/payrolls/" + payrollId).header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        // the holiday premium adjustment must be present on the payslip
        assertThat(slip.getResponse().getContentAsString()).contains("HolidayWorkBonus");
    }

    // ---------------- RBAC: checker role ----------------
    @Test
    void checker_can_scan_but_not_manage() throws Exception {
        String ct = token("checker", "checker123");
        // checker CAN scan (has attendance.scan)
        mvc.perform(post("/api/v1/attendance/scan").header("Authorization", bearer(ct))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qrToken\":\"TGV-emp003\",\"deviceId\":\"junit\",\"scannedAt\":\"2034-01-10T09:00:00+05:00\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.eventType").value("in"));
        // checker CANNOT access management endpoints (no employees.read)
        mvc.perform(get("/api/v1/employees").header("Authorization", bearer(ct)))
            .andExpect(status().isForbidden());
        // checker CANNOT run payroll
        mvc.perform(get("/api/v1/payroll/periods").header("Authorization", bearer(ct)))
            .andExpect(status().isForbidden());
    }

    @Test
    void scan_requires_scan_authority() throws Exception {
        // hr_manager has no attendance.scan -> forbidden
        String hr = token("hr", "hr12345");
        mvc.perform(post("/api/v1/attendance/scan").header("Authorization", bearer(hr))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qrToken\":\"TGV-emp001\",\"deviceId\":\"junit\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void leave_request_notifies_admin() throws Exception {
        String t = token("admin", "admin123");
        mvc.perform(post("/api/v1/leave-requests").header("Authorization", bearer(t))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeId\":2,\"leaveTypeId\":1,\"dateFrom\":\"2043-03-01\",\"dateTo\":\"2043-03-03\"}"))
            .andExpect(status().isCreated());
        MvcResult notif = mvc.perform(get("/api/v1/notifications").header("Authorization", bearer(t)))
            .andExpect(status().isOk()).andReturn();
        assertThat(notif.getResponse().getContentAsString()).contains("Yangi ta'til so'rovi");
    }

    @Test
    void checker_roster_and_scan_by_employee_id() throws Exception {
        String ct = token("checker", "checker123");
        // roster is accessible to the checker (attendance.scan)
        MvcResult ros = mvc.perform(get("/api/v1/attendance/roster").header("Authorization", bearer(ct)))
            .andExpect(status().isOk()).andReturn();
        assertThat(om.readTree(ros.getResponse().getContentAsString()).size()).isEqualTo(3);
        // scan by employeeId (no qrToken) — picked from the roster
        mvc.perform(post("/api/v1/attendance/scan").header("Authorization", bearer(ct))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeId\":2,\"deviceId\":\"junit\",\"scannedAt\":\"2041-02-02T09:00:00+05:00\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.employeeId").value(2))
            .andExpect(jsonPath("$.eventType").value("in"));
    }

    // ---------------- RBAC: employee self-service ----------------
    @Test
    void employee_sees_only_own_data_and_cannot_manage() throws Exception {
        String et = token("ali", "ali123");

        // own profile (employee #1) including QR token
        mvc.perform(get("/api/v1/me/profile").header("Authorization", bearer(et)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.qrToken").value("TGV-emp001"));

        // own attendance range, balances, payslips, types are all reachable
        mvc.perform(get("/api/v1/me/attendance")
                .param("dateFrom", "2026-01-01").param("dateTo", "2026-12-31")
                .header("Authorization", bearer(et)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/leave-balances").header("Authorization", bearer(et)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/payslips").header("Authorization", bearer(et)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/leave-types").header("Authorization", bearer(et)))
            .andExpect(status().isOk());

        // employee CANNOT reach management endpoints (no permissions on the role)
        mvc.perform(get("/api/v1/employees").header("Authorization", bearer(et)))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/payroll/periods").header("Authorization", bearer(et)))
            .andExpect(status().isForbidden());
        // employee CANNOT scan (no attendance.scan)
        mvc.perform(post("/api/v1/attendance/scan").header("Authorization", bearer(et))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qrToken\":\"TGV-emp001\",\"deviceId\":\"junit\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void employee_submits_own_leave_request() throws Exception {
        String et = token("ali", "ali123");
        // self-service submit — no employeeId in the body; server stamps the linked employee (#1)
        mvc.perform(post("/api/v1/me/leave-requests").header("Authorization", bearer(et))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"leaveTypeId\":1,\"dateFrom\":\"2044-05-01\",\"dateTo\":\"2044-05-03\",\"reason\":\"Family\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.employeeId").value(1))
            .andExpect(jsonPath("$.status").value("pending"));

        // and it appears in the employee's own list
        MvcResult mine = mvc.perform(get("/api/v1/me/leave-requests").header("Authorization", bearer(et)))
            .andExpect(status().isOk()).andReturn();
        JsonNode arr = om.readTree(mine.getResponse().getContentAsString());
        boolean found = false;
        for (JsonNode r : arr) {
            if (r.get("dateFrom").asText().equals("2044-05-01")) {
                found = true;
                assertThat(r.get("employeeId").asLong()).isEqualTo(1L);
            }
        }
        assertThat(found).isTrue();
    }
}
