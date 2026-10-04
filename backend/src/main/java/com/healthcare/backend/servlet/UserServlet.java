package com.healthcare.backend.servlet;

import com.google.gson.Gson;
import com.healthcare.backend.util.DBConnection;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;

@WebServlet("/api/users/*")
public class UserServlet extends HttpServlet {

    private final Gson gson = new Gson();

    // GET /api/users -> list all users
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");
        List<Map<String, Object>> users = new ArrayList<>();

        String sql = "SELECT id, name, email, role FROM users ORDER BY id";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> user = new HashMap<>();
                user.put("id", rs.getInt("id"));
                user.put("name", rs.getString("name"));
                user.put("email", rs.getString("email"));
                user.put("role", rs.getString("role"));
                users.add(user);
            }

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(users));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // POST /api/users -> create a new user, plus their doctor/patient sub-record
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }

        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);
        String name = (String) body.get("name");
        String email = (String) body.get("email");
        String password = (String) body.get("password");
        String role = body.get("role") != null ? ((String) body.get("role")).toUpperCase() : "PATIENT";
        String specialty = (String) body.get("specialty"); // optional, doctors only

        String insertUserSql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

        try (Connection conn = DBConnection.getConnection()) {

            int newUserId;
            try (PreparedStatement stmt = conn.prepareStatement(insertUserSql, PreparedStatement.RETURN_GENERATED_KEYS)) {
                stmt.setString(1, name);
                stmt.setString(2, email);
                stmt.setString(3, password);
                stmt.setString(4, role);
                stmt.executeUpdate();

                try (ResultSet keys = stmt.getGeneratedKeys()) {
                    keys.next();
                    newUserId = keys.getInt(1);
                }
            }

            // Create the matching sub-record so bookings/records work immediately
            if (role.equals("DOCTOR")) {
                String sql = "INSERT INTO doctors (user_id, specialty, bio) VALUES (?, ?, ?)";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, newUserId);
                    stmt.setString(2, specialty != null && !specialty.isEmpty() ? specialty : "General Practice");
                    stmt.setString(3, "");
                    stmt.executeUpdate();
                }
            } else if (role.equals("PATIENT")) {
                String sql = "INSERT INTO patients (user_id, date_of_birth, contact) VALUES (?, NULL, NULL)";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setInt(1, newUserId);
                    stmt.executeUpdate();
                }
            }

            resp.setStatus(HttpServletResponse.SC_CREATED);
            resp.getWriter().write(gson.toJson(Map.of("id", newUserId, "message", "User created successfully")));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // PUT /api/users/{id} -> update a user
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        String pathInfo = req.getPathInfo(); // "/{id}"
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write(gson.toJson(Map.of("message", "User id required in URL")));
            return;
        }
        int id = Integer.parseInt(pathInfo.substring(1));

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        }
        Map<?, ?> body = gson.fromJson(sb.toString(), Map.class);

        String sql = "UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, (String) body.get("name"));
            stmt.setString(2, (String) body.get("email"));
            stmt.setString(3, ((String) body.get("role")).toUpperCase());
            stmt.setInt(4, id);
            stmt.executeUpdate();

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(Map.of("message", "User updated successfully")));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }

    // DELETE /api/users/{id}
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json");

        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write(gson.toJson(Map.of("message", "User id required in URL")));
            return;
        }
        int id = Integer.parseInt(pathInfo.substring(1));

        String sql = "DELETE FROM users WHERE id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, id);
            stmt.executeUpdate();

            resp.setStatus(HttpServletResponse.SC_OK);
            resp.getWriter().write(gson.toJson(Map.of("message", "User deleted successfully")));

        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(gson.toJson(Map.of("message", "Server error: " + e.getMessage())));
            e.printStackTrace();
        }
    }
}