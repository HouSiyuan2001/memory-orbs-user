/**
 * Memory Orbs 激活服务器 — Cloudflare Worker
 *
 * KV 存储格式：
 *   user@example.com                     → "authorized" | "activated_1746123456"
 *   account:user@example.com             → {password_hash, created_at}
 *   session:xxx...                       → email (TTL: 24h, expiresAt metadata)
 *   purchase:user@example.com:{ts}       → {email, timestamp}（旧记录保留）
 *
 * API:
 *   POST /activate   { email, code }      → { valid: true/false, reason: "..." }
 *   POST /verify     { email, code }      → { valid: true/false }
 *   POST /purchase   { email }            → 已关闭；付款后由管理员人工在 KV 授权
 *   POST /register   { email, password }  → { success: true }
 *   POST /login      { email, password }  → { success: true, token: "..." }
 *   POST /my-keys    { token }            → { keys: [...] }
 */

// ─── 工具函数 ────────────────────────────────────────

function normalizeEmail(email) {
	return String(email || "").trim().toLowerCase();
}

function normalizeCode(code) {
	return String(code || "").trim().toUpperCase();
}

function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

/**
 * 生成激活码：HMAC-SHA256(邮箱, 密钥) → 取前20位 hex → 大写 → 每5位加-
 */
async function generateCode(email, secret) {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(email));
	const hex = Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.substring(0, 20)
		.toUpperCase();
	return hex.replace(/(.{5})/g, "$1-").slice(0, -1);
}

/**
 * 密码哈希：PBKDF2(HMAC-SHA256, password, salt=email+secret, 100000 iter)
 */
async function hashPassword(password, email, secret) {
	const encoder = new TextEncoder();
	const salt = encoder.encode("mo:" + email + ":" + secret);
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"]
	);
	const hash = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
		key,
		256
	);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * 生成 session token：HMAC(email + timestamp, SECRET)
 */
async function generateToken(email, secret) {
	const data = email + "|" + Date.now();
	return await generateCode(data, secret);
}

/**
 * 验证 session token
 */
async function verifyToken(token, env) {
	const email = await env.MEMORY_ORBS_USERS.get("session:" + token);
	return email || null;
}

// ─── Worker ──────────────────────────────────────────

export async function onRequest({ request, env }) {
		const url = new URL(request.url);
		const apiPaths = new Set(["/activate", "/verify", "/register", "/login", "/my-keys", "/purchase"]);
		if (!apiPaths.has(url.pathname)) {
			return env.ASSETS.fetch(request);
		}

		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		if (request.method !== "POST") {
			return json({ error: "method_not_allowed" }, 405);
		}

		// ──────────────────────────────────────────
		// POST /activate — 首次激活
		// ──────────────────────────────────────────
		if (url.pathname === "/activate") {
			try {
				const { email, code } = await request.json();
				if (!email || !code || typeof email !== "string" || typeof code !== "string") {
					return json({ valid: false, reason: "missing_fields" });
				}
				if (!email.includes("@")) {
					return json({ valid: false, reason: "invalid_email" });
				}

				const normalized = normalizeEmail(email);
				const record = await env.MEMORY_ORBS_USERS.get(normalized);
				if (!record) {
					return json({ valid: false, reason: "email_not_authorized" });
				}
				const expectedCode = await generateCode(normalized, env.SECRET);
				if (normalizeCode(code) !== expectedCode) {
					return json({ valid: false, reason: "invalid_code" });
				}

				if (record.startsWith("activated_")) {
					return json({ valid: true, already_activated: true });
				}

				await env.MEMORY_ORBS_USERS.put(normalized, `activated_${Date.now()}`);
				return json({ valid: true });
			} catch (e) {
				return json({ valid: false, reason: "server_error" }, 500);
			}
		}

		// ──────────────────────────────────────────
		// POST /verify — 只读复验
		// ──────────────────────────────────────────
		if (url.pathname === "/verify") {
			try {
				const { email, code } = await request.json();
				const ne = normalizeEmail(email);
				const nc = normalizeCode(code);
				if (!ne || !nc) return json({ valid: false });

				const record = await env.MEMORY_ORBS_USERS.get(ne);
				if (!record) return json({ valid: false });

				const expected = await generateCode(ne, env.SECRET);
				return json({ valid: nc === expected });
			} catch {
				return json({ valid: false });
			}
		}

		// ──────────────────────────────────────────
		// POST /purchase — 已关闭
		// 当前采用支付宝收款码 + 人工核对收款 + 管理员手动授权。
		// 保留路由是为了让旧前端得到明确错误，而不是继续信任用户自报付款。
		// ──────────────────────────────────────────
		if (url.pathname === "/purchase") {
			return json({
				success: false,
				reason: "manual_review_required",
				message: "请扫码付款后联系管理员。管理员确认收款后会手动开通账号。",
			});
		}

		// ──────────────────────────────────────────
		// POST /register — 注册账号
		// ──────────────────────────────────────────
		if (url.pathname === "/register") {
			try {
				const { email, password } = await request.json();
				if (!email || !password || typeof email !== "string" || typeof password !== "string") {
					return json({ success: false, reason: "missing_fields" });
				}
				if (!email.includes("@")) {
					return json({ success: false, reason: "invalid_email" });
				}
				if (password.length < 6) {
					return json({ success: false, reason: "password_too_short" });
				}

				const normalized = normalizeEmail(email);
				const accountKey = "account:" + normalized;

				const existing = await env.MEMORY_ORBS_USERS.get(accountKey);
				if (existing) {
					return json({ success: false, reason: "email_already_registered" });
				}

				const passwordHash = await hashPassword(password, normalized, env.SECRET);
				await env.MEMORY_ORBS_USERS.put(
					accountKey,
					JSON.stringify({ password_hash: passwordHash, created_at: Date.now() })
				);

				return json({ success: true });
			} catch (e) {
				return json({ success: false, reason: "server_error" }, 500);
			}
		}

		// ──────────────────────────────────────────
		// POST /login — 登录获取 token
		// ──────────────────────────────────────────
		if (url.pathname === "/login") {
			try {
				const { email, password } = await request.json();
				if (!email || !password) {
					return json({ success: false, reason: "missing_fields" });
				}

				const normalized = normalizeEmail(email);
				const accountKey = "account:" + normalized;
				const accountRaw = await env.MEMORY_ORBS_USERS.get(accountKey);

				if (!accountRaw) {
					return json({ success: false, reason: "account_not_found" });
				}

				let account;
				try { account = JSON.parse(accountRaw); } catch {
					return json({ success: false, reason: "server_error" }, 500);
				}

				const hash = await hashPassword(password, normalized, env.SECRET);
				if (hash !== account.password_hash) {
					return json({ success: false, reason: "wrong_password" });
				}

				// 生成 session token（24h 有效期）
				const token = await generateToken(normalized, env.SECRET);
				await env.MEMORY_ORBS_USERS.put("session:" + token, normalized, {
					expirationTtl: 86400,
				});

				return json({ success: true, token, email: normalized });
			} catch (e) {
				return json({ success: false, reason: "server_error" }, 500);
			}
		}

		// ──────────────────────────────────────────
		// POST /my-keys — 查看我的激活码
		// ──────────────────────────────────────────
		if (url.pathname === "/my-keys") {
			try {
				const { token } = await request.json();
				if (!token) return json({ keys: [] });

				const email = await verifyToken(token, env);
				if (!email) return json({ keys: [] });

				// 检查是否有授权记录
				const record = await env.MEMORY_ORBS_USERS.get(email);
				if (!record) return json({ keys: [] });

				const code = await generateCode(email, env.SECRET);
				const status = record.startsWith("activated_") ? "activated" : "authorized";

				return json({ keys: [{ code, status, email }] });
			} catch (e) {
				return json({ keys: [] });
			}
		}

		return json({ error: "not_found" }, 404);
}
