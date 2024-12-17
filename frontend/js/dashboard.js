// Preuzimanje korisničkih podataka iz LocalStorage
const userName = localStorage.getItem("userName");
const userType = localStorage.getItem("userType");

if (userName) {
  document.getElementById(
    "welcomeMessage"
  ).innerText = `Dobrodošli, ${userName}!`;
}

// Sakrivanje sekcija prema tipu korisnika
if (userType === "mentee") {
  document.getElementById("sessionsSection").querySelector("h2").innerText =
    "Vaše sesije sa mentorima korisnicima";
  fetchSessionsForMentee();
  document.getElementById("mentee-select").style.display = "none";
  document.getElementById("mente-selector-label").style.display = "none";
} else if (userType === "mentor") {
  document.getElementById("sessionsSection").querySelector("h2").innerText =
    "Vaše sesije sa mentee korisnicima";
  fetchSessionsForMentor();
  document.getElementById("mentor-select").style.display = "none";
  document.getElementById("mentor-select-label").style.display = "none";
}

// Funkcija za preuzimanje liste mentora sa servera
async function fetchMentors() {
  const mentorListContainer = document.getElementById("mentorList");

  try {
    const response = await fetch("http://127.0.0.1:5000/users/mentor");
    const mentors = await response.json();

    // Očisti sadržaj liste
    mentorListContainer.innerHTML = "";

    if (mentors.length === 0) {
      mentorListContainer.innerHTML = "<p>Nema dostupnih mentora.</p>";
      return;
    }

    // Prikaz mentora
    mentors.forEach((mentor) => {
      const mentorItem = document.createElement("div");
      mentorItem.className = "mentor-item";
      mentorItem.innerHTML = `
        <h3>${mentor.ime}</h3>
        <p>Veštine: ${mentor.vestine}</p>
        <button onclick="scheduleSession(${mentor.id})">Zakazi sesiju</button>
      `;
      mentorListContainer.appendChild(mentorItem);
    });
  } catch (error) {
    console.error("Greška prilikom preuzimanja mentora:", error);
    mentorListContainer.innerHTML =
      "<p>Greška prilikom učitavanja mentora.</p>";
  }
}

// Funkcija za zakazivanje sesije
const mentorList = document.getElementById("mentorList");
const modal = document.getElementById("scheduleModal");
const closeModal = document.querySelector(".close");
const selectedMentorIdInput = document.getElementById("selectedMentorId");
const selectedMentorName = document.getElementById("selectedMentorName");

async function loadMentees() {
  try {
    const response = await fetch("http://127.0.0.1:5000/users/mentee"); // Endpoint za sve mentee korisnike
    const mentees = await response.json();

    const menteeSelect = document.getElementById("mentee-select");
    menteeSelect.innerHTML =
      "<option value='' disabled selected>Odaberite mentee-a</option>";

    mentees.forEach((mentee) => {
      const option = document.createElement("option");
      option.value = mentee.id; // ID mentee-a
      option.textContent = mentee.ime; // Ime mentee-a
      menteeSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Greška prilikom učitavanja mentee korisnika:", error);
  }
}

// Funkcija za učitavanje mentora
async function loadMentors() {
  try {
    const response = await fetch("http://127.0.0.1:5000/users/mentor");
    const mentors = await response.json();

    mentorList.innerHTML = ""; // Resetuje listu mentora

    mentors.forEach((mentor) => {
      const mentorItem = document.createElement("div");
      mentorItem.className = "mentor-item";

      mentorItem.innerHTML = `
        <h3>${mentor.ime}</h3>
        <p>Veštine: ${mentor.vestine}</p>
        <button onclick="openScheduleModal(${mentor.id}, '${mentor.ime}')">Zakaži sesiju</button>
      `;

      mentorList.appendChild(mentorItem);
      const mentorSelect = document.getElementById("mentor-select");
      const option = document.createElement("option");
      option.value = mentor.id; // ID mentora
      option.textContent = mentor.ime; // Ime mentora

      mentorSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Greška prilikom učitavanja mentora:", error);
  }
}

// Funkcija za otvaranje modala
function openScheduleModal(mentorId, mentorName) {
  selectedMentorIdInput.value = mentorId; // Čuva ID mentora
  selectedMentorName.innerText = `Mentor: ${mentorName}`; // Prikazuje ime mentora
  modal.style.display = "block";
}

// Zatvaranje modala
closeModal.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target == modal) {
    modal.style.display = "none";
  }
});

// Zakazivanje sesije
document
  .getElementById("scheduleForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const mentorId = selectedMentorIdInput.value;
    const date = document.getElementById("date").value;
    const description = document.getElementById("description").value;

    try {
      const response = await fetch("http://127.0.0.1:5000/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentor_id: mentorId,
          mentee_id: localStorage.getItem("userId"), // Pretpostavlja se da je mentee prijavljen
          datum: date,
          opis: description,
        }),
      });

      const result = await response.json();
      // alert(result.message);
      modal.style.display = "none";
    } catch (error) {
      console.error("Greška prilikom zakazivanja sesije:", error);
    }
  });

// Pozovi funkciju za učitavanje mentora prilikom učitavanja stranice
loadMentors();
loadMentees();
// Funkcija za preuzimanje sesija za mentora
async function fetchSessionsForMentor() {
  const mentorId = localStorage.getItem("userId"); // Pretpostavlja se da je ID korisnika sačuvan u LocalStorage
  const sessionsContainer = document.getElementById("sessionsList");

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/sessions/mentor/${mentorId}`
    );
    const sessions = await response.json();

    // Očisti prethodni sadržaj
    sessionsContainer.innerHTML = "";

    if (sessions.length === 0) {
      sessionsContainer.innerHTML = "<p>Nema zakazanih sesija.</p>";
      return;
    }

    // Prikaz svake sesije
    sessions.forEach((session) => {
      const sessionItem = document.createElement("div");
      sessionItem.className = "session-item";
      sessionItem.innerHTML = `
        <h3>Datum: ${session.datum}</h3>
        <p>Mentee: ${session.mentee_ime}</p>
        <p>Opis: ${session.opis || "Nema opisa"}</p>
      `;
      sessionsContainer.appendChild(sessionItem);
    });
  } catch (error) {
    console.error("Greška prilikom preuzimanja sesija:", error);
    sessionsContainer.innerHTML = "<p>Greška prilikom učitavanja sesija.</p>";
  }
}

// Funkcija za preuzimanje sesija za mentee korisnika
async function fetchSessionsForMentee() {
  const menteeId = localStorage.getItem("userId");
  const sessionsContainer = document.getElementById("sessionsList");

  try {
    // console.log(`Fetching sessions for mentee ID: ${menteeId}`);
    const response = await fetch(
      `http://127.0.0.1:5000/sessions/mentee/${menteeId}`
    );
    const sessions = await response.json();
    // console.log("Sessions response:", sessions);

    sessionsContainer.innerHTML = "";

    if (sessions.length === 0) {
      sessionsContainer.innerHTML = "<p>Nema zakazanih sesija.</p>";
      return;
    }

    sessions.forEach((session) => {
      const sessionItem = document.createElement("div");
      sessionItem.className = "session-item";
      sessionItem.innerHTML = `
        <h3>Datum: ${session.datum}</h3>
        <p>Mentor: ${session.mentor_ime}</p>
        <p>Opis: ${session.opis || "Nema opisa"}</p>
      `;
      sessionsContainer.appendChild(sessionItem);
    });
  } catch (error) {
    console.error("Greška prilikom preuzimanja sesija:", error);
    sessionsContainer.innerHTML = "<p>Greška prilikom učitavanja sesija.</p>";
  }
}

// Inicijalizacija SocketIO
const socket = io("http://127.0.0.1:5000");

// Elementi DOM-a
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendButton = document.querySelector("button[onclick='']");

// Informacije o korisniku
const userId = localStorage.getItem("userId");

// Poveži se na sobu (mentor ili mentee)
const otherUserId =
  userType === "mentee"
    ? document.getElementById("mentor-select").value
    : document.getElementById("mentee-select").value;

if (otherUserId) {
  const roomName = [userId, otherUserId].sort().join("_");
  console.log("Odabrani otherUserId:", otherUserId);
  console.log("Formirani roomName:", roomName);
  socket.emit("join_room", roomName);
}

async function loadMessages(otherUserId) {
  const userId = localStorage.getItem("userId");
  const chatBox = document.getElementById("chatBox");

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/messages/${userId}/${otherUserId}`
    );
    const messages = await response.json();

    console.log("Učitane poruke:", messages);

    chatBox.innerHTML = ""; // Očisti postojeće poruke

    messages.forEach((message) => {
      const messageDiv = document.createElement("div");
      messageDiv.textContent =
        message.sender_id == userId
          ? `Vi: ${message.content}`
          : `${message.sender_name}: ${message.content}`;
      messageDiv.className =
        message.sender_id == userId ? "chat-message self" : "chat-message";
      chatBox.appendChild(messageDiv);
    });
  } catch (error) {
    console.error("Greška prilikom učitavanja poruka:", error);
  }
}

// Frontend: Listen for incoming messages
socket.on("receive_message", (data) => {
  console.log("Primljena poruka:", data); // Dodajte log da biste proverili dolazak poruke
  const messageDiv = document.createElement("div");
  messageDiv.textContent = `${data.senderName}: ${data.message}`;
  messageDiv.className = "chat-message";
  chatBox.insertBefore(messageDiv, chatBox.firstChild);
});

// Sending message (already in your code)
sendButton.addEventListener("click", () => {
  console.log(chatBox);
  const message = chatInput.value.trim();
  const otherUserId =
    userType === "mentee"
      ? document.getElementById("mentor-select").value
      : document.getElementById("mentee-select").value;

  if (!otherUserId) {
    alert("Odaberite korisnika sa kojim želite da komunicirate!");
    return;
  }

  if (message) {
    const messageData = {
      room: [userId, otherUserId].sort().join("_"),
      senderId: userId,
      senderName: userName,
      receiverId: otherUserId,
      message,
    };
    socket.emit("send_message", messageData);

    // Show sent message locally
    const messageDiv = document.createElement("div");
    messageDiv.textContent = `${userName}: ${message}`;
    messageDiv.className = "chat-message self";
    chatBox.appendChild(messageDiv);

    chatInput.value = ""; // Clear input
  }
});
socket.on("join_room", (roomName) => {
  console.log("Korisnik se pridružio sobi:", roomName); // Proverite da li soba postoji
  socket.join(roomName);
});