from flask import Flask, request, jsonify
from flask_socketio import SocketIO, send, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from flask_cors import CORS


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

# Konfiguracija baze podataka
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mentorska_platforma.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Modeli baze podataka
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ime = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), unique=True, nullable=False)
    lozinka = db.Column(db.String(255), nullable=False)
    tip = db.Column(db.String(10), nullable=False)  # mentor ili mentee
    vestine = db.Column(db.Text, nullable=True)

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    mentee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    datum = db.Column(db.DateTime, nullable=False)
    opis = db.Column(db.Text, nullable=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# API za registraciju korisnika
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    hashed_password = generate_password_hash(data['lozinka'], method='pbkdf2:sha256')
    new_user = User(
        ime=data['ime'],
        email=data['email'],
        lozinka=hashed_password,
        tip=data['tip'],
        vestine=data.get('vestine', '')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "Registracija uspešna!"}), 201

# API za prijavu korisnika
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.lozinka, data['lozinka']):
        return jsonify({
            "message": f"Dobrodošli, {user.ime}!",
            "ime": user.ime,
            "id": user.id,
            "tip": user.tip
        })
    return jsonify({"message": "Pogrešan email ili lozinka."}), 401

# API za listu mentora ili mentee korisnika
@app.route('/users/<tip>', methods=['GET'])
def list_users(tip):
    users = User.query.filter_by(tip=tip).all()
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "ime": user.ime,
            "vestine": user.vestine
        })
    return jsonify(result)

# API za listu mentora ili mentee korisnika
@app.route('/users', methods=['GET'])
def list_users1():
    users = User.query.all()
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "ime": user.ime,
            "email": user.email,
            "tip": user.tip,
            "vestine": user.vestine
        })
    return jsonify(result)

# API za zakazivanje sesija
@app.route('/schedule', methods=['POST'])
def schedule_session():
    data = request.json
    try:
        datum = datetime.strptime(data['datum'], '%Y-%m-%dT%H:%M')
    except ValueError:
        return jsonify({"message": "Neispravan format datuma."}), 400
    new_session = Session(
        mentor_id=data['mentor_id'],
        mentee_id=data['mentee_id'],
        datum=datum,
        opis=data.get('opis', '')
    )
    db.session.add(new_session)
    db.session.commit()
    return jsonify({"message": "Sesija uspešno zakazana!"}), 201

# API za povezivanje mentora i mentee na osnovu veština
@app.route('/match', methods=['POST'])
def match_mentor():
    data = request.json
    mentee_interesi = set(data['interesi'].lower().split(', '))
    mentori = User.query.filter_by(tip='mentor').all()

    podudaranja = []
    for mentor in mentori:
        mentor_veštine = set(mentor.vestine.lower().split(', '))
        zajednicke_veštine = mentee_interesi.intersection(mentor_veštine)
        broj_podudaranja = len(zajednicke_veštine)
        podudaranja.append({
            'mentor_id': mentor.id,
            'ime': mentor.ime,
            'podudaranja': broj_podudaranja,
            'zajednicke_veštine': list(zajednicke_veštine)
        })

    podudaranja.sort(key=lambda x: x['podudaranja'], reverse=True)
    return jsonify(podudaranja)

# API za preuzimanje zakazanih sesija za mentora
@app.route('/sessions/mentor/<mentor_id>', methods=['GET'])
def get_sessions_for_mentor(mentor_id):
    sessions = Session.query.filter_by(mentor_id=mentor_id).all()
    result = []
    for session in sessions:
        mentee = User.query.get(session.mentee_id)
        result.append({
            "id": session.id,
            "mentee_ime": mentee.ime if mentee else "Nepoznat mentee",
            "datum": session.datum.strftime('%Y-%m-%d %H:%M:%S'),
            "opis": session.opis
        })
    return jsonify(result)

# API za preuzimanje zakazanih sesija za mentora
@app.route('/sessions/mentee/<mentee_id>', methods=['GET'])
def get_sessions_for_mentee(mentee_id):
    sessions = Session.query.filter_by(mentee_id=mentee_id).all()
    result = []
    for session in sessions:
        mentor = User.query.get(session.mentor_id)  # Dohvati mentora
        result.append({
            "id": session.id,
            "mentor_ime": mentor.ime if mentor else "Nepoznat mentor",  # Prikaz imena mentora
            "datum": session.datum.strftime('%Y-%m-%d %H:%M:%S'),
            "opis": session.opis
        })
    return jsonify(result)

# Chat
# Slušač za povezivanje klijenta na sobu
@socketio.on("join_room")
def handle_join_room(data):
    print(f"{data['userId']} se pridruzio sobi")
    join_room(data)
    emit("system_message", {"message": f"Pridružili ste se sobi {data}."}, room=data)

# Slušač za primanje i emitovanje poruka
@socketio.on("send_message")
def handle_send_message(data):
    print("Primljeni podaci:", data)  # Ovo će prikazati sadržaj `data`
    room = data.get("room", "N/A")
    sender_id = data.get("senderId", "N/A")
    receiver_id = data.get("receiverId", "N/A")
    message_content = data.get("message", "N/A")
    print(f"Room: {room}, Sender: {sender_id}, Receiver: {receiver_id}, Message: {message_content}")
    room = data["room"]
    message_data = {
        "senderName": data["senderName"],
        "message": data["message"]
    }

    # Sačuvaj poruku u bazi
    new_message = Message(
        sender_id=data["senderId"],
        receiver_id=data["receiverId"],
        content=data["message"]
    )
    db.session.add(new_message)
    db.session.commit()

    message = data["message"]
    # Emituj poruku svim korisnicima u sobi
    socketio.emit("receive_message", {
        "senderName": data["senderName"],
        "message": message
    }, room=room)

    print(f"Poruka poslata u sobu {room}: {data["message"]}")

@app.route('/messages/<user1_id>/<user2_id>', methods=['GET'])
def get_messages(user1_id, user2_id):
    try:
        messages = Message.query.filter(
            ((Message.sender_id == user1_id) & (Message.receiver_id == user2_id)) |
            ((Message.sender_id == user2_id) & (Message.receiver_id == user1_id))
        ).order_by(Message.timestamp).all()

        result = [
            {
                "sender_id": message.sender_id,
                "receiver_id": message.receiver_id,
                "content": message.content,
                "timestamp": message.timestamp.strftime('%Y-%m-%d %H:%M:%S')
            }
            for message in messages
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Pokretanje aplikacije
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Kreiranje tabela u bazi ako ne postoje
    socketio.run(app, debug=True)
