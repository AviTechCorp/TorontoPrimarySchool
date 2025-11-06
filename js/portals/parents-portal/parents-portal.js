// js/portals/parents-portal/parents-portal.js

// This should be the same config as in your other portal files
const firebaseConfig = {
  apiKey: "AIzaSyAJlr-6eTCCpQtWHkPics3-tbOS_X5xA84",
  authDomain: "school-website-66326.firebaseapp.com",
  databaseURL: "https://school-website-66326-default-rtdb.firebaseio.com",
  projectId: "school-website-66326",
  storageBucket: "school-website-66326.firebasestorage.app",
  messagingSenderId: "660829781706",
  appId: "1:660829781706:web:bf447db1d80fc094d9be33"
};

document.addEventListener('DOMContentLoaded', () => {
    initializeParentPortal();
});

/**
 * Main initialization function for the Parent Portal.
 */
function initializeParentPortal() {
    const userData = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!userData || userData.role !== 'parent') {
        console.error("User data not found or role is not 'parent'. Redirecting.");
        window.location.href = 'auth.html';
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // Load dynamic data into the portal
    loadParentProfile(db, userData);
    setupParentChatEngine(db, userData);

    // Set up UI interactions
    setupPortalNavigation();
}

async function loadParentProfile(db, userData) {
    const profileName = document.querySelector('#profile .profile-name');
    const profileEmail = document.querySelector('#profile .profile-email');
    const profileContact = document.querySelector('#profile .profile-contact');
    const parentUidInput = document.getElementById('parent-uid');

    if (profileName) profileName.innerHTML = `<strong>Name:</strong> ${userData.name || 'N/A'}`;
    if (profileEmail) profileEmail.innerHTML = `<strong>Email:</strong> ${userData.email || 'N/A'}`;
    if (profileContact) profileContact.innerHTML = `<strong>Contact:</strong> ${userData.contactNumber || 'N/A'}`;

    // **FIX**: Automatically populate the hidden UID field in the form.
    // This is crucial for linking the parent's auth account to their child's record.
    if (parentUidInput && userData.uid) {
        parentUidInput.value = userData.uid;
    }
}

function setupPortalNavigation() {
    const navLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.portal-section');

    function showSection(targetId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active-section');
            targetSection.classList.remove('hidden-section');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            showSection(targetId);
            history.pushState(null, null, `#${targetId}`);
        });
    });

    const initialHash = window.location.hash.substring(1) || 'dashboard';
    showSection(initialHash);
    const initialLink = document.querySelector(`.sidebar a[href="#${initialHash}"]`);
    if (initialLink) initialLink.classList.add('active');
}

// =========================================================
// === PARENT CHAT ENGINE ===
// =========================================================

let parentActiveChatListener = null;

/**
 * Initializes the chat system for the parent's portal.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentData - The authenticated parent's data.
 */
function setupParentChatEngine(db, parentData) {
    const chatList = document.getElementById('parent-chat-list');
    if (!chatList) return;

    // Listen for any chats where the parent is a participant
    db.collection('chats')
      .where('parentId', '==', parentData.uid)
      .orderBy('lastMessageTimestamp', 'desc')
      .onSnapshot(snapshot => {
          if (snapshot.empty) {
              chatList.innerHTML = '<p class="info-message">You have no conversations yet.</p>';
              return;
          }

          chatList.innerHTML = ''; // Clear list
          snapshot.forEach(doc => {
              const chat = doc.data();
              const li = document.createElement('li');
              li.dataset.chatId = doc.id;
              li.dataset.teacherId = chat.teacherId;
              li.dataset.teacherName = chat.teacherName;

              li.innerHTML = `
                  <span class="parent-name">${chat.teacherName}</span>
                  <span class="learner-name">Regarding: ${chat.learnerName}</span>
                  ${chat.unreadByParentCount > 0 ? `<span class="unread-badge">${chat.unreadByParentCount}</span>` : ''}
              `;
              li.addEventListener('click', () => openParentChat(db, parentData, chat, li));
              chatList.appendChild(li);
          });
      }, error => {
          console.error("Error fetching parent chats:", error);
          chatList.innerHTML = '<p class="error-message">Could not load conversations.</p>';
      });
}

/**
 * Opens a chat window with a specific teacher.
 * @param {firebase.firestore.Firestore} db - The Firestore database instance.
 * @param {object} parentData - The authenticated parent's data.
 * @param {object} chatData - The data for the selected chat.
 * @param {HTMLElement} listItem - The clicked list item element.
 */
async function openParentChat(db, parentData, chatData, listItem) {
    document.querySelectorAll('#parent-chat-list li').forEach(li => li.classList.remove('active'));
    listItem.classList.add('active');

    const chatWindow = document.getElementById('parent-chat-window');
    document.getElementById('parent-chat-welcome-message').style.display = 'none';
    chatWindow.style.display = 'flex';

    const chatId = listItem.dataset.chatId;

    chatWindow.innerHTML = `
        <div class="chat-header" style="padding: 15px; border-bottom: 1px solid var(--color-border);">
            <h4>Chat with ${chatData.teacherName}</h4>
        </div>
        <div class="chat-messages" id="parent-chat-messages-container"></div>
        <div class="chat-input-area">
            <input type="text" id="parent-chat-message-input" placeholder="Type your reply...">
            <button id="parent-chat-send-btn" class="cta-button-small"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;

    const messagesContainer = document.getElementById('parent-chat-messages-container');
    const messageInput = document.getElementById('parent-chat-message-input');
    const sendBtn = document.getElementById('parent-chat-send-btn');

    if (parentActiveChatListener) {
        parentActiveChatListener();
    }

    const messagesRef = db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'desc');
    parentActiveChatListener = messagesRef.onSnapshot(snapshot => {
        messagesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const msg = doc.data();
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.classList.add(msg.senderId === parentData.uid ? 'sent' : 'received');
            messageDiv.textContent = msg.text;
            messagesContainer.appendChild(messageDiv);
        });
    });

    // Mark messages as read when opening the chat
    const chatRef = db.collection('chats').doc(chatId);
    chatRef.update({ unreadByParentCount: 0 });

    // **NEW**: Find all unread messages from the teacher and mark them as 'read'
    try {
        // **FIX**: Create a new query for marking messages as read.
        // Do not reuse messagesRef, as it has an orderBy('timestamp') which conflicts with the inequality filter on 'senderId'.
        const unreadMessagesQuery = db.collection('chats').doc(chatId).collection('messages')
            .where('senderId', '!=', parentData.uid)
            .where('status', '==', 'sent');
        const unreadSnapshot = await unreadMessagesQuery.get();

        if (!unreadSnapshot.empty) {
            const batch = db.batch();
            unreadSnapshot.forEach(doc => {
                batch.update(doc.ref, { status: 'read' });
            });
            await batch.commit();
        }
    } catch (error) {
        // This might fail if an index is required. The console will provide a link to create it.
        console.error("Could not mark messages as read. This may require a Firestore index.", error);
    }


    const sendMessage = async () => {
        const text = messageInput.value.trim();
        if (text === '') return;

        messageInput.value = '';

        // Re-use chatRef from above
        const messagePayload = {
            text: text,
            senderId: parentData.uid,
            senderName: parentData.name || 'Parent', // **FIX**: Ensure parent's name is included
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        };

        const batch = db.batch();
        batch.set(chatRef.collection('messages').doc(), messagePayload);
        batch.set(chatRef, {
            lastMessage: text,
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unreadByTeacherCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });

        await batch.commit();
    };

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}