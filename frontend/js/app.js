const API_BASE_URL = "http://127.0.0.1:5000"; // URL za backend

// Funkcija za registraciju korisnika
async function register() {
  const ime = document.getElementById("ime").value;
  const email = document.getElementById("email").value;
  const lozinka = document.getElementById("lozinka").value;
  const tip = document.getElementById("tip").value;
  const vestine = document.getElementById("vestine").value;

  const data = { ime, email, lozinka, tip, vestine };

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    alert(result.message);
    ime.value = "";
    vestine.value = "";
    email.value = "";
    lozinka.value = "";
  } catch (error) {
    console.error("Greška prilikom registracije:", error);
    alert("Registracija nije uspela.");
  }
}

// Funkcija za prijavu korisnika
async function login() {
  const email = document.getElementById("loginEmail").value;
  const lozinka = document.getElementById("loginPassword").value;

  const data = { email, lozinka };

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      // Čuvanje korisničkih podataka u LocalStorage
      localStorage.setItem("userName", result.ime);
      localStorage.setItem("userId", result.id);
      localStorage.setItem("userType", result.tip); // Čuvanje tipa korisnika
      alert(result.message);
      // Prelazak na dashboard stranicu
      window.location.href = "./dashboard.html";
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error("Greška prilikom prijave:", error);
    alert("Prijava nije uspela.");
  }
}
