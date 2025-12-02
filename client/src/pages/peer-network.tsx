import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Heart, MessageCircle, Send, Users, Calendar, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getApiUrl } from "@/lib/api-config";

function ChatDialog({ peerId, peerName }: { peerId: string; peerName: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const loadMessages = async () => {
    const res = await fetch(getApiUrl(`/peers/chat/${peerId}`), { credentials: "include" });
    const data = await res.json();
    setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const res = await fetch(getApiUrl("/peers/chat/send"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ receiverId: peerId, message: newMessage }),
    });
    if (res.ok) {
      setNewMessage("");
      loadMessages();
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [peerId]);

  return (
    <div className="space-y-4">
      <div className="h-96 overflow-y-auto space-y-2 p-4 border rounded-lg">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xs p-3 rounded-lg ${msg.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p>{msg.message}</p>
              <p className="text-xs opacity-70 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ScheduleDialog({ peerId, peerName }: { peerId: string; peerName: string }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const createMeeting = async () => {
    if (!title || !scheduledAt) return;
    const res = await fetch(getApiUrl("/peers/meetings/create"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ participantId: peerId, title, scheduledAt: new Date(scheduledAt).toISOString() }),
    });
    if (res.ok) {
      toast({ title: "Meeting scheduled successfully" });
      setTitle("");
      setScheduledAt("");
    }
  };

  return (
    <div className="space-y-4">
      <Input placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      <Button onClick={createMeeting} className="w-full">
        Schedule Meeting
      </Button>
    </div>
  );
}

export default function PeerNetwork() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feed, setFeed] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [allPeers, setAllPeers] = useState<any[]>([]);
  const [conditionFilter, setConditionFilter] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAllPeers, setShowAllPeers] = useState(true);

  const loadFeed = async () => {
    const res = await fetch("/api/peers/feed", { credentials: "include" });
    const data = await res.json();
    setFeed(data);
  };

  const createPost = async () => {
    if (!newPost.trim()) return;
    
    const res = await fetch("/api/peers/posts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: newPost }),
    });
    
    if (res.ok) {
      setNewPost("");
      loadFeed();
      toast({ title: "Post created successfully" });
    }
  };

  const toggleLike = async (postId: string) => {
    const res = await fetch(`/api/peers/posts/${postId}/like`, {
      method: "POST",
      credentials: "include",
    });
    
    if (res.ok) {
      loadFeed();
    }
  };

  const loadComments = async (postId: string) => {
    const res = await fetch(`/api/peers/posts/${postId}/comments`, { credentials: "include" });
    const data = await res.json();
    setComments(data);
  };

  const addComment = async (postId: string) => {
    if (!newComment.trim()) return;
    
    const res = await fetch(`/api/peers/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: newComment }),
    });
    
    if (res.ok) {
      setNewComment("");
      loadComments(postId);
      loadFeed();
    }
  };

  const deletePost = async (postId: string) => {
    const res = await fetch(`/api/peers/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });
    
    if (res.ok) {
      loadFeed();
      toast({ title: "Post deleted" });
    }
  };

  const loadAllPeers = async () => {
    const res = await fetch("/api/peers/search", { credentials: "include" });
    const data = await res.json();
    setAllPeers(data);
  };

  const searchPeers = async () => {
    const params = new URLSearchParams();
    if (conditionFilter) params.append('condition', conditionFilter);
    
    const res = await fetch(`/api/peers/search?${params}`, { credentials: "include" });
    const data = await res.json();
    setSearchResults(data);
  };

  useEffect(() => {
    loadFeed();
    loadAllPeers();
    const interval = setInterval(loadFeed, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">Connect with other {user?.role}s</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Share your thoughts, experiences, or questions..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button onClick={createPost} disabled={!newPost.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Post
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feed Posts */}
            {feed.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <Avatar>
                        <AvatarImage src={post.authorAvatar} />
                        <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{post.authorName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {post.authorId === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePost(post.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <p className="text-base whitespace-pre-wrap">{post.content}</p>

                  <Separator />

                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLike(post.id)}
                      className={post.userLiked ? "text-red-500" : ""}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${post.userLiked ? "fill-current" : ""}`} />
                      {post.likesCount}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPost(post);
                            loadComments(post.id);
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {post.commentsCount}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Comments</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {comments.map((comment) => (
                              <div key={comment.id} className="flex gap-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={comment.authorAvatar} />
                                  <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 bg-muted p-3 rounded-lg">
                                  <p className="font-semibold text-sm">{comment.authorName}</p>
                                  <p className="text-sm">{comment.content}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && addComment(selectedPost.id)}
                            />
                            <Button onClick={() => addComment(selectedPost.id)}>
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Find Peers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={showAllPeers ? "default" : "outline"}
                    onClick={() => setShowAllPeers(true)}
                    className="flex-1"
                  >
                    All Peers
                  </Button>
                  <Button
                    size="sm"
                    variant={!showAllPeers ? "default" : "outline"}
                    onClick={() => setShowAllPeers(false)}
                    className="flex-1"
                  >
                    Filter
                  </Button>
                </div>
                {!showAllPeers && user?.role === 'patient' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Filter by condition"
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                    />
                    <Button size="sm" onClick={searchPeers} className="w-full">
                      Apply Filter
                    </Button>
                  </div>
                )}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(showAllPeers ? allPeers : searchResults).slice(0, 20).map((peer) => (
                    <div key={peer.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={peer.avatar} />
                          <AvatarFallback>{peer.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{peer.name}</p>
                          {peer.medicalConditions && peer.medicalConditions.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {peer.medicalConditions.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Chat with {peer.name}</DialogTitle>
                            </DialogHeader>
                            <ChatDialog peerId={peer.id} peerName={peer.name} />
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <Calendar className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Schedule Meeting with {peer.name}</DialogTitle>
                            </DialogHeader>
                            <ScheduleDialog peerId={peer.id} peerName={peer.name} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
