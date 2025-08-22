'use client';

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent } from "@components/components/ui/card";
import { Button } from "@components/components/ui/button";

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
  useEffect(()=>{
    if(userId === followerId){
      setFollowerId(userId === 1 ? 2 : 1);
    }
  }, [userId, followerId]);

  // Socket.io setup
  useEffect(() => {
    const s = io(WS, { query: { user_id: userId.toString() } });
    socketRef.current = s;

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('notification', (n: Notification) => {
      setNotifications((cur) => [n, ...cur]);
    });

    s.on('posts', (content: Content) => {
      setPosts((cur) => [content, ...cur]);
    });

    s.on('posts:update', (updated: Content) => {
      setPosts((cur) => cur.map((p) => p.id === updated.id ? updated : p));
      setMyPosts((cur) => cur.map((p) => p.id === updated.id ? updated : p));
    });

    return () => s.disconnect();
  }, [userId]);

  // Fetch posts and notifications
  useEffect(() => {
    fetch(`${API}/posts?follower_id=${userId}`)
      .then((r) => r.json())
      .then((rows) => setMyPosts(rows));

    fetch(`${API}/posts?follower_id=${followerId}`)
      .then((r) => r.json())
      .then((rows) => setPosts(rows));

    fetch(`${API}/notifications?user_id=${userId}`)
      .then((r) => r.json())
      .then((rows) => setNotifications(rows));
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
    <main className="flex flex-col min-h-screen">
      {/* Top slim action bar */}
 {/* Top slim action bar */}
<div className="flex justify-between items-center px-6 py-2 border-b bg-white shadow-sm">
  {/* Follow Button */}
  <Button onClick={() => followUser(userId, followerId)}>➕ Follow {followerId}</Button>

  {/* User ID input */}
  <div className="flex items-center gap-2">
    <label className="text-sm">View as</label>
    <input
      type="number"
      value={userId}
      min={1}
      onChange={(e) => setUserId(parseInt(e.target.value || '1', 10))}
      className="w-20 rounded-lg border px-3 py-1 text-center"
    />
    <span className="text-sm">{connected ? '🟢 connected' : '🔴 disconnected'}</span>
  </div>

  {/* Create Post Button */}
  <Button onClick={() => createPost(userId)}>✍️ Create Post</Button>
</div>

      {/* Main 3-column layout */}
      <div className="flex flex-1">
        {/* My Posts */}
        <div className="w-1/3 border-r p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">My Posts</h2>
          {myPosts.length === 0 ? <p className="text-sm text-gray-500">You haven’t posted yet.</p> : (
            myPosts.map((p) => (
              <Card key={p.id} className="mb-4">
                <CardHeader>
                  <CardTitle>Post #{p.id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Author: {p.author_id} (me)</p>
                  <p className="text-sm text-gray-500">Created: {p.created_at}</p>
                  <p className="mt-1">Likes: {p.like}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => likeContent(userId, p.id)}>👍 Like</Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Other Users' Posts */}
        <div className="w-1/3 border-r p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">User {followerId}'s Posts</h2>
          {posts.length === 0 ? <p className="text-sm text-gray-500">No posts yet.</p> : (
            posts.map((post) => (
              <Card key={post.id} className="mb-4">
                <CardHeader>
                  <CardTitle>Post #{post.id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Author: {post.author_id}</p>
                  <p className="text-sm text-gray-500">Created: {post.created_at}</p>
                  <p className="mt-1">Likes: {post.like}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => likeContent(userId, post.id)}>👍 Like</Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Notifications */}
        <div className="w-1/3 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          {notifications.length === 0 ? <p className="text-sm text-gray-500">No notifications yet.</p> : (
            notifications.map((n) => (
              <Card key={n.id} className="mb-4">
                <CardHeader>
                  <CardTitle>{n.type.replace('_', ' ').toUpperCase()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">#{n.id} • {n.created_at}</p>
                  <p>actor: {n.actor_id} → recipient: {n.recipient_id}</p>
                  {n.content_id && <p className="text-xs text-gray-600">content_id: {n.content_id}</p>}
                  <span className={`mt-2 inline-block text-xs px-2 py-1 rounded ${n.read ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {n.read ? 'read' : 'unread'}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
