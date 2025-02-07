from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
drawings = []

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connections(data):
    emit("drawing", drawings)

@socketio.on('drawings have been changed')
def handle_drawing(new_drawings):
    global drawings
    drawings = new_drawings.copy()
    print("Received drawing data:", new_drawings)
    emit('drawing', new_drawings, broadcast=True, include_self=False)



if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', debug=True)
