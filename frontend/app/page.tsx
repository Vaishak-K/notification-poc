'use client';

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent } from "@components/components/ui/card";
import { Button } from "@components/components/ui/button";
import { toast } from 'react-toastify';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
const WS = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000';

type Notification = {
  id: number;
  event_id: string;
  recipient_id: number;
  type: string;
  actor_id: number;
  content_id?: number;
  metadata_json?: string;
  created_at: string;
  read: number;
};

interface Content {
  id: number;
  author_id: number;
  type: 'like' | 'comment' | string;
  like: number;
  created_at: string;
}

export default function Page() {
  const [userId, setUserId] = useState<number>(1);
  const [followerId, setFollowerId] = useState<number>(2);
  const [posts, setPosts] = useState<Content[]>([]);
  const [myPosts, setMyPosts] = useState<Content[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const socketRef = useRef<any>(null);
  

  // ensure follower is not same as user


  // Socket.io setup
  useEffect(() => {
  const s = io(WS, { query: { user_id: userId.toString() } });
  socketRef.current = s;

  s.on('connect', () => setConnected(true));
  s.on('disconnect', () => setConnected(false));

  // notifications
  s.on('notification', (n: Notification) =>
    setNotifications((cur) => [n, ...cur])
  );

  // new posts
  s.on('posts', (content: Content) => {
    if (content.author_id === userId) {
      // my own post
      setMyPosts((cur) => [content, ...cur]);
    } else {
      // other users' posts
      setPosts((cur) => [content, ...cur]);
    }
  });

  // post updates (likes, etc.)
  s.on('posts:update', (updated: Content) => {
    if (updated.author_id === userId) {
      setMyPosts((cur) =>
        cur.map((p) => (p.id === updated.id ? updated : p))
      );
    } else {
      setPosts((cur) =>
        cur.map((p) => (p.id === updated.id ? updated : p))
      );
    }
  });

  return () => {
    s.disconnect();
    console.log("Socket disconnected on cleanup");
  };
}, [userId]);


  // Fetch initial data
  useEffect(() => {
    fetch(`${API}/posts?follower_id=${userId}`).then((r) => r.json()).then(setMyPosts);
    fetch(`${API}/posts?follower_id=${followerId}`).then((r) => r.json()).then(setPosts);
    fetch(`${API}/notifications?user_id=${userId}`).then((r) => r.json()).then(setNotifications);
  }, [userId, followerId]);

  // Actions
  const createPost = async (author: number) => {
    await fetch(`${API}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_id: author, type: 'post' }),
    });

    await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: `ev_${Date.now()}`, type: 'post_created', actor_id: author }),
    });
  };

  const followUser = async (actor: number, target: number) => {
    if(actor===target){
      toast("You cannot follow you 😂")
      setFollowerId((prev)=>prev+1)
      return 
    }
    await fetch(`${API}/follows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'follow', follower_id: actor, followee_id: target }),
    });

    await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: `ev_${Date.now()}`, type: 'follow', actor_id: actor, target_user_id: target }),
    });
  };

  const likeContent = async (actor: number, contentId: number) => {
    await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: `ev_${Date.now()}`, type: 'like', actor_id: actor, content_id: contentId }),
    });
  };

  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="flex justify-between items-center px-6 py-3 border-b bg-white shadow-sm sticky top-0 z-10">
        {/* Left - Follow */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={followerId}
            min={1}
            onChange={(e) => setFollowerId(parseInt(e.target.value || '1', 10))}
            className="w-20 rounded-lg border px-3 py-1 text-center text-sm"
          />
          <Button onClick={() => followUser(userId, followerId)}>➕ Follow {followerId}</Button>
        </div>

        {/* Center - Status */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">View as</label>
          <input
            type="number"
            value={userId}
            min={1}
            onChange={(e) => setUserId(parseInt(e.target.value || '1', 10))}
            className="w-20 rounded-lg border px-3 py-1 text-center text-sm"
          />
          <span className={`text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? '🟢 connected' : '🔴 disconnected'}
          </span>
        </div>

        {/* Right - Create */}
        <Button onClick={() => createPost(userId)} className="bg-blue-600 hover:bg-blue-700 text-white">
          ✍️ Create Post
        </Button>
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 divide-x">
        {/* My Posts */}
        <section className="w-1/3 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">My Posts</h2>
          {myPosts.length === 0 ? (
            <p className="text-sm text-gray-500">You haven’t posted yet.</p>
          ) : (
            myPosts.map((p) => (
              <Card key={p.id} className="mb-4 hover:shadow-md transition">
                <CardHeader>
                  <CardTitle className="text-base">Post #{p.id}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="mb-1">Author: {p.author_id} (me)</p>
                  <p className="text-gray-500">Created: {p.created_at}</p>
                  <p className="mt-2 font-medium">Likes: {p.like}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => likeContent(userId, p.id)}>
                    👍 Like
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        {/* Other Users' Posts */}
        <section className="w-1/3 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">User {followerId}'s Posts</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-gray-500">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="mb-4 hover:shadow-md transition">
                <CardHeader>
                  <CardTitle className="text-base">Post #{post.id}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="mb-1">Author: {post.author_id}</p>
                  <p className="text-gray-500">Created: {post.created_at}</p>
                  <p className="mt-2 font-medium">Likes: {post.like}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => likeContent(userId, post.id)}>
                    👍 Like
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        {/* Notifications */}
        <section className="w-1/3 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <Card key={n.id} className="mb-4 hover:shadow-md transition">
                <CardHeader>
                  <CardTitle className="text-base">{n.type.replace('_', ' ').toUpperCase()}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-gray-500">#{n.id} • {n.created_at}</p>
                  <p>actor: {n.actor_id} → recipient: {n.recipient_id}</p>
                  {n.content_id && <p className="text-xs text-gray-600">content_id: {n.content_id}</p>}
                  <span className={`mt-2 inline-block text-xs px-2 py-1 rounded ${n.read ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {n.read ? 'read' : 'unread'}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
