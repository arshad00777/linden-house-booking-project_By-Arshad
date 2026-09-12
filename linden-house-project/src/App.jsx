import { useState, useEffect, useRef } from "react";
import {
  Search, CalendarDays, Users, MapPin, CreditCard, CheckCircle2,
  LogOut, LogIn, Plus, Trash2, Pencil, ShieldCheck, Mail,
  MessageSquare, Bell, ClipboardList, UserCircle2, X, ChevronLeft,
  BedDouble, Loader2, DoorOpen, Wifi, Coffee, Flame, Sun, Home
} from "lucide-react";

/* ---------------------------------- data ---------------------------------- */

const ROOM_THEMES = [
  ["#3E5641", "#6C8768"],
  ["#9C4A34", "#C97E5F"],
  ["#BE8A3D", "#E3B564"],
  ["#2C3F2F", "#4E6A50"],
  ["#7A5232", "#B08654"],
  ["#4B5E63", "#7C959A"],
];  

const DEFAULT_ROOMS = [
  { id: "r1", name: "Garden Room", type: "Standard", property: "Linden House — Hillside", location: "Coonoor, Nilgiris", price: 3200, capacity: 2, amenities: ["Wi-Fi", "Garden view", "Breakfast"], description: "A ground-floor room opening onto the kitchen garden, with a writing desk and a wood-burning stove for cool evenings.", available: true },
  { id: "r2", name: "Attic Suite", type: "Suite", property: "Linden House — Hillside", location: "Coonoor, Nilgiris", price: 5400, capacity: 3, amenities: ["Wi-Fi", "Fireplace", "Balcony", "Breakfast"], description: "Under the eaves with sloped wooden ceilings, a window seat, and views over the tea slopes.", available: true },
  { id: "r3", name: "Courtyard Room", type: "Standard", property: "Linden House — Old Quarter", location: "Jaipur, Rajasthan", price: 2800, capacity: 2, amenities: ["Wi-Fi", "Courtyard access", "Fan"], description: "Opens onto a shaded stone courtyard, with block-printed textiles and a hand-carved jharokha window.", available: true },
  { id: "r4", name: "Haveli Loft", type: "Suite", property: "Linden House — Old Quarter", location: "Jaipur, Rajasthan", price: 4600, capacity: 4, amenities: ["Wi-Fi", "AC", "Rooftop access", "Breakfast"], description: "A double-height loft with rooftop access, for evening views over the old city walls.", available: true },
  { id: "r5", name: "Tide Room", type: "Standard", property: "Linden House — Harbor", location: "Fontainhas, Goa", price: 3600, capacity: 2, amenities: ["Wi-Fi", "AC", "Sea breeze"], description: "A Portuguese-tiled room two minutes from the water, with shuttered windows and a hammock corner.", available: true },
  { id: "r6", name: "Captain's Suite", type: "Suite", property: "Linden House — Harbor", location: "Fontainhas, Goa", price: 6200, capacity: 3, amenities: ["Wi-Fi", "AC", "Private terrace", "Breakfast"], description: "The largest room in the house, with a private terrace and a clawfoot tub facing the harbour lights.", available: true },
];

const DEFAULT_USERS = [
  { id: "u-admin", name: "Priya Nair", email: "admin@linden.house", phone: "9800000000", password: "admin123", role: "admin" },
];

const AMENITY_ICON = { "Wi-Fi": Wifi, "Breakfast": Coffee, "Fireplace": Flame, "Sea breeze": Sun };

/* -------------------------------- storage --------------------------------- */

// Uses browser localStorage so the app persists data with no backend needed.
async function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("storage error", e);
    return false;
  }
}

function genCode(prefix) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}
function fmtMoney(n) {
  return "₹" + n.toLocaleString("en-IN");
}
function nightsBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

/* ---------------------------------- app ------------------------------------ */

export default function LindenHouseApp() {
  const [ready, setReady] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [session, setSession] = useState(null); // user object
  const [view, setView] = useState("browse"); // browse | bookings | admin
  const [showAuth, setShowAuth] = useState(false);
  const [bookingFlow, setBookingFlow] = useState(null); // {room, step, ...}
  const [toasts, setToasts] = useState([]);

  const [filters, setFilters] = useState({
    location: "any",
    checkIn: todayStr(),
    checkOut: addDays(todayStr(), 2),
    guests: 2,
    type: "any",
    maxPrice: 7000,
  });

  useEffect(() => {
    (async () => {
      let r = await loadJSON("ghbs:rooms", null);
      if (!r) { r = DEFAULT_ROOMS; await saveJSON("ghbs:rooms", r); }
      let u = await loadJSON("ghbs:users", null);
      if (!u) { u = DEFAULT_USERS; await saveJSON("ghbs:users", u); }
      let b = await loadJSON("ghbs:bookings", []);
      let s = await loadJSON("ghbs:session", null);
      setRooms(r); setUsers(u); setBookings(b);
      if (s) {
        const found = u.find((x) => x.id === s.userId);
        if (found) setSession(found);
      }
      setReady(true);
    })();
  }, []);

  function pushToast(msg, icon) {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  async function persistRooms(next) { setRooms(next); await saveJSON("ghbs:rooms", next); }
  async function persistUsers(next) { setUsers(next); await saveJSON("ghbs:users", next); }
  async function persistBookings(next) { setBookings(next); await saveJSON("ghbs:bookings", next); }

  async function handleLogin(email, password) {
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) { pushToast("Email or password doesn't match our records.", X); return false; }
    setSession(u);
    await saveJSON("ghbs:session", { userId: u.id });
    setShowAuth(false);
    pushToast(`Welcome back, ${u.name.split(" ")[0]}.`, CheckCircle2);
    return true;
  }
  async function handleRegister(data) {
    if (users.some((x) => x.email.toLowerCase() === data.email.toLowerCase())) {
      pushToast("An account with that email already exists.", X);
      return false;
    }
    const u = { id: "u-" + Date.now(), role: "guest", ...data };
    const next = [...users, u];
    await persistUsers(next);
    setSession(u);
    await saveJSON("ghbs:session", { userId: u.id });
    setShowAuth(false);
    pushToast("Account created — verification email sent.", Mail);
    return true;
  }
  async function handleLogout() {
    setSession(null);
    await saveJSON("ghbs:session", null);
    setView("browse");
    pushToast("Signed out.", LogOut);
  }

  function filteredRooms() {
    return rooms.filter((r) => {
      if (filters.location !== "any" && r.location !== filters.location) return false;
      if (filters.type !== "any" && r.type !== filters.type) return false;
      if (r.price > filters.maxPrice) return false;
      if (r.capacity < filters.guests) return false;
      if (!r.available) return false;
      const clash = bookings.some(
        (b) => b.roomId === r.id && b.status === "confirmed" &&
          overlaps(filters.checkIn, filters.checkOut, b.checkIn, b.checkOut)
      );
      return !clash;
    });
  }

  function openBooking(room) {
    if (!session) { setShowAuth(true); pushToast("Sign in to book a room.", LogIn); return; }
    if (nightsBetween(filters.checkIn, filters.checkOut) <= 0) {
      pushToast("Check-out must be after check-in.", X); return;
    }
    setBookingFlow({
      room, step: 1,
      guestName: session.name, guestEmail: session.email, guestPhone: session.phone || "",
      checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests,
      paymentMethod: "Card",
    });
  }

  async function confirmBooking() {
    const bf = bookingFlow;
    const nights = nightsBetween(bf.checkIn, bf.checkOut);
    const amount = nights * bf.room.price;
    const booking = {
      id: "b-" + Date.now(),
      code: genCode("LH"),
      roomId: bf.room.id,
      roomName: bf.room.name,
      property: bf.room.property,
      userId: session.id,
      guestName: bf.guestName, guestEmail: bf.guestEmail, guestPhone: bf.guestPhone,
      checkIn: bf.checkIn, checkOut: bf.checkOut, guests: bf.guests, nights, amount,
      paymentMethod: bf.paymentMethod,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    const next = [...bookings, booking];
    await persistBookings(next);
    setBookingFlow({ ...bf, step: 4, confirmedBooking: booking });
    pushToast("Booking confirmed — email & SMS sent.", CheckCircle2);
  }

  async function cancelBooking(id) {
    const next = bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b));
    await persistBookings(next);
    pushToast("Booking cancelled.", Bell);
  }

  async function saveRoom(room) {
    const exists = rooms.some((r) => r.id === room.id);
    const next = exists ? rooms.map((r) => (r.id === room.id ? room : r)) : [...rooms, room];
    await persistRooms(next);
    pushToast(exists ? "Room updated." : "Room added.", CheckCircle2);
  }
  async function deleteRoom(id) {
    const active = bookings.some((b) => b.roomId === id && b.status === "confirmed" && new Date(b.checkOut) >= new Date());
    if (active) { pushToast("Can't remove a room with an active booking.", X); return; }
    await persistRooms(rooms.filter((r) => r.id !== id));
    pushToast("Room removed.", Trash2);
  }

  if (!ready) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <GlobalStyle />
        <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#3E5641" }} />
      </div>
    );
  }

  const locations = ["any", ...Array.from(new Set(rooms.map((r) => r.location)))];

  return (
    <div className="app-shell">
      <GlobalStyle />

      <header className="top-bar">
        <div className="brand">
          <Home size={20} />
          <div>
            Linden House
            <small>Guest stays, kept simple</small>
          </div>
        </div>
        <nav className="top-nav">
          <button className={`nav-link ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>Stays</button>
          {session && <button className={`nav-link ${view === "bookings" ? "active" : ""}`} onClick={() => setView("bookings")}>My bookings</button>}
          {session?.role === "admin" && <button className={`nav-link ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}>Admin panel</button>}
          {session ? (
            <div className="user-chip">
              <UserCircle2 size={16} />
              <span>{session.name.split(" ")[0]}</span>
              <button className="icon-btn" onClick={handleLogout} title="Sign out"><LogOut size={15} /></button>
            </div>
          ) : (
            <button className="btn brass" onClick={() => setShowAuth(true)}>Sign in</button>
          )}
        </nav>
      </header>

      {view === "browse" && (
        <BrowseView
          filters={filters} setFilters={setFilters} locations={locations}
          rooms={filteredRooms()} onBook={openBooking}
        />
      )}
      {view === "bookings" && session && (
        <MyBookings bookings={bookings.filter((b) => b.userId === session.id)} onCancel={cancelBooking} />
      )}
      {view === "admin" && session?.role === "admin" && (
        <AdminPanel rooms={rooms} bookings={bookings} users={users}
          onSaveRoom={saveRoom} onDeleteRoom={deleteRoom} onCancelBooking={cancelBooking} />
      )}

      <SupportStrip />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} onRegister={handleRegister} />}
      {bookingFlow && (
        <BookingModal
          state={bookingFlow} setState={setBookingFlow}
          onClose={() => setBookingFlow(null)}
          onConfirm={confirmBooking}
        />
      )}

      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon = t.icon || Bell;
          return (
            <div key={t.id} className="toast">
              <Icon size={16} />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- sub views --------------------------------- */

function BrowseView({ filters, setFilters, locations, rooms, onBook }) {
  const nights = nightsBetween(filters.checkIn, filters.checkOut);
  return (
    <>
      <section className="hero">
        <h1>Small houses, well kept, in places worth staying.</h1>
        <p className="hero-sub">Six rooms across three houses — search by place and date, and book directly with the people who run them.</p>

        <div className="search-card">
          <div className="field">
            <label><MapPin size={13} /> Where</label>
            <select value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
              {locations.map((l) => <option key={l} value={l}>{l === "any" ? "Any location" : l}</option>)}
            </select>
          </div>
          <div className="field">
            <label><CalendarDays size={13} /> Check in</label>
            <input type="date" value={filters.checkIn} min={todayStr()}
              onChange={(e) => setFilters({ ...filters, checkIn: e.target.value })} />
          </div>
          <div className="field">
            <label><CalendarDays size={13} /> Check out</label>
            <input type="date" value={filters.checkOut} min={addDays(filters.checkIn, 1)}
              onChange={(e) => setFilters({ ...filters, checkOut: e.target.value })} />
          </div>
          <div className="field">
            <label><Users size={13} /> Guests</label>
            <input type="number" min="1" max="8" value={filters.guests}
              onChange={(e) => setFilters({ ...filters, guests: Number(e.target.value) || 1 })} />
          </div>
          <div className="field narrow">
            <label>Room type</label>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="any">Any</option>
              <option value="Standard">Standard</option>
              <option value="Suite">Suite</option>
            </select>
          </div>
          <div className="field narrow">
            <label>Up to {fmtMoney(filters.maxPrice)}/night</label>
            <input type="range" min="2000" max="7000" step="200" value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })} />
          </div>
        </div>
        {nights > 0 && <p className="nights-note">{nights} night{nights > 1 ? "s" : ""} · {filters.guests} guest{filters.guests > 1 ? "s" : ""}</p>}
      </section>

      <section className="room-grid">
        {rooms.length === 0 && (
          <div className="empty-state">
            <DoorOpen size={22} />
            <p>Nothing free for those dates. Try adjusting the search, or widen the price range.</p>
          </div>
        )}
        {rooms.map((r, i) => (
          <RoomCard key={r.id} room={r} theme={ROOM_THEMES[i % ROOM_THEMES.length]} onBook={() => onBook(r)} />
        ))}
      </section>
    </>
  );
}

function RoomCard({ room, theme, onBook }) {
  return (
    <div className="room-card">
      <div className="art" style={{ background: `linear-gradient(135deg, ${theme[0]}, ${theme[1]})` }}>
        <span className="tag">{room.type}</span>
        <BedDouble size={26} color="rgba(255,255,255,0.85)" style={{ position: "absolute", right: 14, bottom: 12 }} />
      </div>
      <div className="body">
        <h3>{room.name}</h3>
        <div className="loc"><MapPin size={13} /> {room.property} · {room.location}</div>
        <p className="desc">{room.description}</p>
        <div className="chips">
          {room.amenities.map((a) => {
            const Icon = AMENITY_ICON[a] || CheckCircle2;
            return <span key={a} className="amenity-chip"><Icon size={11} /> {a}</span>;
          })}
        </div>
        <div className="price-row">
          <div className="price">{fmtMoney(room.price)}<span> /night · sleeps {room.capacity}</span></div>
          <button className="btn primary" onClick={onBook}>View & book</button>
        </div>
      </div>
    </div>
  );
}

function MyBookings({ bookings, onCancel }) {
  const sorted = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <section className="page">
      <h2 className="page-title">My bookings</h2>
      {sorted.length === 0 && <p className="muted">No stays booked yet — search above to find a room.</p>}
      <div className="booking-list">
        {sorted.map((b) => (
          <div key={b.id} className={`booking-row ${b.status}`}>
            <div>
              <strong>{b.roomName}</strong>
              <div className="muted">{b.property}</div>
              <div className="muted">{b.checkIn} → {b.checkOut} · {b.nights} night{b.nights > 1 ? "s" : ""} · {b.guests} guest{b.guests > 1 ? "s" : ""}</div>
              <div className="code-chip">Booking {b.code}</div>
            </div>
            <div className="booking-right">
              <div className="price">{fmtMoney(b.amount)}</div>
              <span className={`status-pill ${b.status}`}>{b.status}</span>
              {b.status === "confirmed" && <button className="btn ghost small" onClick={() => onCancel(b.id)}>Cancel</button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminPanel({ rooms, bookings, users, onSaveRoom, onDeleteRoom, onCancelBooking }) {
  const [tab, setTab] = useState("rooms");
  const [editing, setEditing] = useState(null); // room being edited, or "new"

  const revenue = bookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.amount, 0);
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <section className="page">
      <h2 className="page-title">Admin panel</h2>
      <div className="stat-row">
        <div className="stat-card"><span>{rooms.length}</span>Rooms managed</div>
        <div className="stat-card"><span>{confirmedCount}</span>Active bookings</div>
        <div className="stat-card"><span>{fmtMoney(revenue)}</span>Revenue collected</div>
        <div className="stat-card"><span>{users.length}</span>Registered guests</div>
      </div>

      <div className="tab-row">
        {["rooms", "bookings", "users"].map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "rooms" ? "Rooms & availability" : t === "bookings" ? "Bookings & payments" : "Guests"}
          </button>
        ))}
      </div>

      {tab === "rooms" && (
        <div>
          <div className="row-between">
            <p className="muted">Update pricing, toggle availability, or retire a room.</p>
            <button className="btn brass" onClick={() => setEditing("new")}><Plus size={14} /> Add room</button>
          </div>
          <table className="ledger">
            <thead><tr><th>Room</th><th>Property</th><th>Type</th><th>Price/night</th><th>Sleeps</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.property}</td>
                  <td>{r.type}</td>
                  <td>{fmtMoney(r.price)}</td>
                  <td>{r.capacity}</td>
                  <td>
                    <button className={`status-pill ${r.available ? "confirmed" : "cancelled"}`}
                      onClick={() => onSaveRoom({ ...r, available: !r.available })}>
                      {r.available ? "available" : "closed"}
                    </button>
                  </td>
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => setEditing(r)}><Pencil size={14} /></button>
                    <button className="icon-btn danger" onClick={() => onDeleteRoom(r.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "bookings" && (
        <table className="ledger">
          <thead><tr><th>Code</th><th>Guest</th><th>Room</th><th>Dates</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((b) => (
              <tr key={b.id}>
                <td>{b.code}</td>
                <td>{b.guestName}<div className="muted small">{b.guestEmail}</div></td>
                <td>{b.roomName}</td>
                <td>{b.checkIn} → {b.checkOut}</td>
                <td>{fmtMoney(b.amount)}</td>
                <td>{b.paymentMethod}</td>
                <td><span className={`status-pill ${b.status}`}>{b.status}</span></td>
                <td>{b.status === "confirmed" && <button className="btn ghost small" onClick={() => onCancelBooking(b.id)}>Cancel</button>}</td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan="8" className="muted">No bookings yet.</td></tr>}
          </tbody>
        </table>
      )}

      {tab === "users" && (
        <table className="ledger">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.phone || "—"}</td><td>{u.role}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <RoomEditModal room={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(r) => { onSaveRoom(r); setEditing(null); }} />
      )}
    </section>
  );
}

/* -------------------------------- modals ------------------------------------ */

function AuthModal({ onClose, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    let ok;
    if (mode === "login") ok = await onLogin(form.email, form.password);
    else {
      if (!form.name || !form.email || !form.password) { setErr("Fill in every field to continue."); setBusy(false); return; }
      ok = await onRegister(form);
    }
    setBusy(false);
    if (!ok) setErr("Please check the details and try again.");
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{mode === "login" ? "Sign in" : "Create your account"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="form">
          {mode === "register" && (
            <div className="field"><label>Full name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          )}
          <div className="field"><label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          {mode === "register" && (
            <div className="field"><label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          )}
          <div className="field"><label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          {err && <p className="error-text">{err}</p>}
          <button className="btn primary wide" disabled={busy}>
            {busy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="switch-line">
          {mode === "login" ? "New to Linden House?" : "Already have an account?"}{" "}
          <button className="link-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
        {mode === "login" && <p className="hint-text">Demo admin — admin@linden.house / admin123</p>}
      </div>
    </div>
  );
}

function BookingModal({ state, setState, onClose, onConfirm }) {
  const { room, step } = state;
  const nights = nightsBetween(state.checkIn, state.checkOut);
  const amount = nights * room.price;
  const [processing, setProcessing] = useState(false);

  async function pay() {
    setProcessing(true);
    setTimeout(async () => { setProcessing(false); await onConfirm(); }, 900);
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && step !== 4 && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{room.name}</h3>
          {step !== 4 && <button className="icon-btn" onClick={onClose}><X size={16} /></button>}
        </div>
        <div className="steps">
          {[1, 2, 3, 4].map((n) => <div key={n} className={`step-dot ${step >= n ? "active" : ""}`} />)}
        </div>

        {step === 1 && (
          <div className="form">
            <p className="muted small">{room.property} · {room.location}</p>
            <div className="field-row">
              <div className="field"><label>Check in</label><input type="date" value={state.checkIn}
                onChange={(e) => setState({ ...state, checkIn: e.target.value })} /></div>
              <div className="field"><label>Check out</label><input type="date" value={state.checkOut}
                onChange={(e) => setState({ ...state, checkOut: e.target.value })} /></div>
            </div>
            <div className="field"><label>Guests</label><input type="number" min="1" max={room.capacity} value={state.guests}
              onChange={(e) => setState({ ...state, guests: Number(e.target.value) || 1 })} /></div>
            <div className="field"><label>Guest name</label><input value={state.guestName}
              onChange={(e) => setState({ ...state, guestName: e.target.value })} /></div>
            <div className="field"><label>Email</label><input type="email" value={state.guestEmail}
              onChange={(e) => setState({ ...state, guestEmail: e.target.value })} /></div>
            <div className="field"><label>Phone</label><input value={state.guestPhone}
              onChange={(e) => setState({ ...state, guestPhone: e.target.value })} /></div>
            <button className="btn primary wide" disabled={nights <= 0}
              onClick={() => setState({ ...state, step: 2 })}>Review booking</button>
            {nights <= 0 && <p className="error-text">Check-out must be after check-in.</p>}
          </div>
        )}

        {step === 2 && (
          <div className="form">
            <div className="summary-box">
              <div className="summary-row"><span>Dates</span><span>{state.checkIn} → {state.checkOut}</span></div>
              <div className="summary-row"><span>Nights</span><span>{nights}</span></div>
              <div className="summary-row"><span>Guests</span><span>{state.guests}</span></div>
              <div className="summary-row"><span>Guest</span><span>{state.guestName}</span></div>
              <div className="summary-row total"><span>Total</span><span>{fmtMoney(amount)}</span></div>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setState({ ...state, step: 1 })}><ChevronLeft size={14} /> Back</button>
              <button className="btn primary" onClick={() => setState({ ...state, step: 3 })}>Continue to payment</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form">
            <label className="label-standalone">Payment method</label>
            <div className="payment-options">
              {["Card", "UPI", "Net Banking"].map((m) => (
                <button key={m} className={`pay-opt ${state.paymentMethod === m ? "active" : ""}`}
                  onClick={() => setState({ ...state, paymentMethod: m })}>
                  <CreditCard size={15} /> {m}
                </button>
              ))}
            </div>
            <div className="summary-box">
              <div className="summary-row total"><span>Amount due</span><span>{fmtMoney(amount)}</span></div>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setState({ ...state, step: 2 })}><ChevronLeft size={14} /> Back</button>
              <button className="btn brass" onClick={pay} disabled={processing}>
                {processing ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : `Pay ${fmtMoney(amount)} now`}
              </button>
            </div>
          </div>
        )}

        {step === 4 && state.confirmedBooking && (
          <div className="form confirm-panel">
            <CheckCircle2 size={40} color="#3E5641" />
            <h4>Booking confirmed</h4>
            <p className="code-big">{state.confirmedBooking.code}</p>
            <p className="muted">{room.name} · {state.confirmedBooking.checkIn} → {state.confirmedBooking.checkOut}</p>
            <div className="notify-note"><Mail size={13} /> Confirmation emailed to {state.guestEmail}</div>
            <div className="notify-note"><MessageSquare size={13} /> SMS sent to {state.guestPhone || "your phone"}</div>
            <button className="btn primary wide" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function RoomEditModal({ room, onClose, onSave }) {
  const [form, setForm] = useState(room ? { ...room, amenities: room.amenities.join(", ") } : {
    name: "", type: "Standard", property: "", location: "", price: 3000, capacity: 2, amenities: "", description: "", available: true,
  });

  function submit(e) {
    e.preventDefault();
    onSave({
      ...form,
      id: room ? room.id : "r-" + Date.now(),
      price: Number(form.price), capacity: Number(form.capacity),
      amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head"><h3>{room ? "Edit room" : "Add a room"}</h3>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button></div>
        <form onSubmit={submit} className="form">
          <div className="field"><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field-row">
            <div className="field"><label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option>Standard</option><option>Suite</option>
              </select></div>
            <div className="field"><label>Price/night</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          </div>
          <div className="field"><label>Property</label><input required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })} /></div>
          <div className="field-row">
            <div className="field"><label>Location</label><input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="field"><label>Sleeps</label><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
          <div className="field"><label>Amenities (comma separated)</label><input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} /></div>
          <div className="field"><label>Description</label><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <button className="btn primary wide">{room ? "Save changes" : "Add room"}</button>
        </form>
      </div>
    </div>
  );
}

function SupportStrip() {
  const items = [
    { icon: Mail, label: "Email service" },
    { icon: MessageSquare, label: "SMS service" },
    { icon: Bell, label: "Notifications" },
    { icon: ShieldCheck, label: "Payment gateway" },
  ];
  return (
    <div className="support-strip">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="service-pill"><span className="dot-live" /><Icon size={13} /> {label}</div>
      ))}
    </div>
  );
}

/* --------------------------------- styles ----------------------------------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap');

      :root {
        --paper: #F0EBDF;
        --ink: #23261F;
        --moss: #3E5641;
        --moss-dark: #2C3F2F;
        --brass: #BE8A3D;
        --brass-dark: #9C6F2C;
        --clay: #9C4A34;
        --mist: #DCE2D4;
        --white: #FFFCF6;
      }
      * { box-sizing: border-box; }
      *:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
      @keyframes spin { to { transform: rotate(360deg); } }

      .app-shell { min-height: 100%; background: var(--paper); font-family: 'Inter', sans-serif; color: var(--ink); }

      .top-bar { background: var(--moss); color: var(--white); padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
      .brand { font-family: 'Fraunces', serif; font-weight: 600; font-size: 21px; display: flex; align-items: center; gap: 8px; }
      .brand small { display: block; font-family: 'Inter'; font-weight: 400; font-size: 11px; opacity: 0.72; margin-top: 1px; }
      .top-nav { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .nav-link { background: transparent; border: none; color: rgba(255,255,255,0.82); padding: 8px 12px; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: 500; }
      .nav-link.active, .nav-link:hover { background: rgba(255,255,255,0.14); color: white; }
      .user-chip { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.14); padding: 6px 12px; border-radius: 20px; font-size: 14px; margin-left: 4px; }

      .hero { padding: 48px 32px 32px; max-width: 1080px; margin: 0 auto; }
      .hero h1 { font-family: 'Fraunces', serif; font-size: 38px; font-weight: 600; line-height: 1.12; max-width: 620px; margin: 0 0 10px; }
      .hero-sub { color: #565a4c; max-width: 520px; margin: 0; font-size: 15px; }

      .search-card { background: var(--white); border: 1px solid var(--mist); border-top: 4px solid var(--brass); border-radius: 12px; padding: 20px; margin-top: 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: end; }
      .search-card .field { flex: 1 1 130px; min-width: 120px; }
      .search-card .field.narrow { flex: 1 1 150px; }
      .nights-note { margin: 12px 2px 0; font-size: 13px; color: #6b6f5f; }

      .field { display: flex; flex-direction: column; gap: 6px; }
      .field label { font-size: 12px; color: #6b6f5f; display: flex; align-items: center; gap: 4px; font-weight: 500; }
      .field input, .field select, .field textarea {
        border: 1px solid var(--mist); border-radius: 7px; padding: 9px 10px; font-size: 14px; font-family: inherit; background: var(--white); color: var(--ink);
      }
      .field-row { display: flex; gap: 12px; }
      .field-row .field { flex: 1; }

      .room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 20px; padding: 8px 32px 56px; max-width: 1080px; margin: 0 auto; }
      .room-card { background: var(--white); border: 1px solid var(--mist); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
      .room-card .art { height: 110px; position: relative; }
      .room-card .art .tag { position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.88); color: var(--moss-dark); font-family: 'Fraunces'; font-style: italic; font-size: 12px; padding: 3px 10px; border-radius: 20px; }
      .room-card .body { padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .room-card h3 { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; margin: 0; }
      .loc { font-size: 12.5px; color: #6b6f5f; display: flex; align-items: center; gap: 4px; }
      .desc { font-size: 13px; color: #565a4c; line-height: 1.45; margin: 0; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .amenity-chip { font-size: 11px; background: var(--mist); color: var(--moss-dark); padding: 3px 9px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }
      .price-row { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 6px; }
      .price { font-family: 'Fraunces', serif; font-size: 21px; font-weight: 600; color: var(--moss-dark); }
      .price span { font-family: 'Inter'; font-size: 11.5px; font-weight: 400; color: #86886f; }

      .empty-state { grid-column: 1/-1; text-align: center; padding: 48px 20px; color: #6b6f5f; display: flex; flex-direction: column; align-items: center; gap: 8px; }

      .btn { border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 13.5px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
      .btn.primary { background: var(--moss); color: white; }
      .btn.primary:hover { background: var(--moss-dark); }
      .btn.brass { background: var(--brass); color: white; }
      .btn.brass:hover { background: var(--brass-dark); }
      .btn.ghost { background: transparent; border: 1px solid var(--mist); color: var(--ink); }
      .btn.wide { width: 100%; justify-content: center; }
      .btn.small { padding: 6px 12px; font-size: 12.5px; }
      .btn:disabled { opacity: 0.55; cursor: default; }
      .icon-btn { background: transparent; border: none; cursor: pointer; color: inherit; padding: 6px; border-radius: 6px; display: inline-flex; }
      .icon-btn:hover { background: rgba(0,0,0,0.06); }
      .icon-btn.danger:hover { background: rgba(156,74,52,0.12); color: var(--clay); }
      .link-btn { background: none; border: none; color: var(--moss); font-weight: 600; cursor: pointer; padding: 0; font-size: inherit; }

      .page { padding: 32px; max-width: 1080px; margin: 0 auto; }
      .page-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; margin: 0 0 18px; }
      .muted { color: #6b6f5f; font-size: 13.5px; }
      .muted.small { font-size: 12px; }

      .booking-list { display: flex; flex-direction: column; gap: 12px; }
      .booking-row { background: var(--white); border: 1px solid var(--mist); border-radius: 10px; padding: 16px 18px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .booking-row.cancelled { opacity: 0.6; }
      .booking-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
      .code-chip { display: inline-block; margin-top: 6px; font-size: 11.5px; background: var(--mist); color: var(--moss-dark); padding: 3px 9px; border-radius: 20px; }
      .status-pill { border: none; font-size: 11.5px; font-weight: 600; padding: 4px 11px; border-radius: 20px; text-transform: capitalize; cursor: default; }
      .status-pill.confirmed { background: #E1EBD9; color: var(--moss-dark); }
      .status-pill.cancelled { background: #F0DAD3; color: var(--clay); }

      .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
      .stat-card { background: var(--white); border: 1px solid var(--mist); border-radius: 10px; padding: 16px 18px; font-size: 13px; color: #6b6f5f; }
      .stat-card span { display: block; font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; color: var(--moss-dark); margin-bottom: 2px; }

      .tab-row { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; }
      .tab { background: transparent; border: 1px solid var(--mist); padding: 8px 14px; border-radius: 20px; font-size: 13.5px; cursor: pointer; color: var(--ink); }
      .tab.active { background: var(--moss); color: white; border-color: var(--moss); }

      .row-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; }
      .row-actions { display: flex; gap: 2px; }

      .ledger { width: 100%; border-collapse: collapse; font-size: 13.5px; background: var(--white); border-radius: 10px; overflow: hidden; }
      .ledger th { text-align: left; background: var(--moss); color: white; padding: 10px 14px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 13px; }
      .ledger td { padding: 10px 14px; border-bottom: 1px solid var(--mist); }
      .ledger tr:nth-child(even) td { background: #F7F4EC; }

      .overlay { position: fixed; inset: 0; background: rgba(35,38,31,0.55); display: flex; align-items: center; justify-content: center; z-index: 60; padding: 20px; }
      .modal { background: var(--white); border-radius: 14px; max-width: 460px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 26px; }
      .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
      .modal-head h3 { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; margin: 0; }
      .form { display: flex; flex-direction: column; gap: 12px; }
      .error-text { color: var(--clay); font-size: 13px; margin: 0; }
      .hint-text { font-size: 12px; color: #86886f; text-align: center; margin: 14px 0 0; }
      .switch-line { text-align: center; font-size: 13.5px; margin: 14px 0 0; }
      .label-standalone { font-size: 12px; color: #6b6f5f; font-weight: 500; }

      .steps { display: flex; gap: 6px; margin-bottom: 18px; }
      .step-dot { flex: 1; height: 4px; border-radius: 2px; background: var(--mist); }
      .step-dot.active { background: var(--brass); }

      .summary-box { background: #F7F4EC; border-radius: 10px; padding: 14px 16px; }
      .summary-row { display: flex; justify-content: space-between; font-size: 13.5px; padding: 4px 0; color: #565a4c; }
      .summary-row.total { border-top: 1px solid var(--mist); margin-top: 6px; padding-top: 10px; font-weight: 700; color: var(--ink); font-size: 15px; }
      .modal-actions { display: flex; justify-content: space-between; gap: 10px; }

      .payment-options { display: flex; gap: 8px; flex-wrap: wrap; }
      .pay-opt { border: 1px solid var(--mist); background: white; padding: 9px 14px; border-radius: 8px; cursor: pointer; font-size: 13.5px; display: flex; align-items: center; gap: 6px; }
      .pay-opt.active { border-color: var(--brass); background: #FBF3E4; color: var(--brass-dark); font-weight: 600; }

      .confirm-panel { align-items: center; text-align: center; }
      .confirm-panel h4 { font-family: 'Fraunces', serif; font-size: 21px; margin: 4px 0 0; }
      .code-big { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; color: var(--moss-dark); letter-spacing: 1px; margin: 0; }
      .notify-note { font-size: 12.5px; color: #6b6f5f; display: flex; align-items: center; gap: 6px; }

      .support-strip { background: var(--mist); padding: 22px 32px; display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
      .service-pill { display: flex; align-items: center; gap: 6px; background: var(--white); padding: 8px 14px; border-radius: 20px; font-size: 12.5px; color: #4d5041; border: 1px solid rgba(0,0,0,0.05); }
      .dot-live { width: 7px; height: 7px; border-radius: 50%; background: #4c8a52; }

      .toast-stack { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 100; }
      .toast { background: var(--ink); color: var(--white); padding: 10px 16px; border-radius: 8px; font-size: 13.5px; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.18); }

      @media (max-width: 640px) {
        .hero h1 { font-size: 28px; }
        .top-bar { padding: 14px 18px; }
        .hero, .room-grid, .page, .support-strip { padding-left: 18px; padding-right: 18px; }
      }
    `}</style>
  );
}
