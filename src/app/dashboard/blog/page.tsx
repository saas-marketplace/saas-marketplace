"use client";

import { createClient } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/auth-lock-manager";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Image as ImageIcon,
  Calendar,
  User,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { logAudit, AuditActions, AuditSections } from '@/lib/services/audit';

const supabase = createClient();

interface Blog {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  author: string | null;
  created_at: string;
}

export default function BlogPage() {
  // Get all access control state FIRST
  const { isLoading, isRemoved, isSuspended, canAccessSection, all } = useAccessControl();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    image_url: "",
    author: "",
  });

  const [previewImage, setPreviewImage] = useState<string>("");

  // Guard to prevent duplicate fetches in React StrictMode
  const blogsFetchedRef = useRef(false);
  const isFetchingRef = useRef(false); // Track ongoing fetches

  const fetchBlogs = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    
    // Only use ref guard for initial mount, not for subsequent refreshes
    const isInitialFetch = !blogsFetchedRef.current;
    if (isInitialFetch) {
      blogsFetchedRef.current = true;
    }
    
    isFetchingRef.current = true;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBlogs(data);
    }
    setLoading(false);
    isFetchingRef.current = false;
  }, []);

  // ALL hooks must be called before any early returns - useEffect FIRST
  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Fetch current user on mount
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();
  }, [supabase]);

  // Now safe to do early returns - all hooks have been called
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (isRemoved) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Access Removed
        </h2>
        <p className="text-slate-500 text-center max-w-md">
          Your access to this application has been removed. Please contact the administrator.
        </p>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Account Suspended
        </h2>
        <p className="text-slate-500 text-center max-w-md">
          Your account is currently suspended. Please contact the administrator.
        </p>
      </div>
    );
  }

  if (!canAccessSection('blogs')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Access Restricted
        </h2>
        <p className="text-slate-500 text-center max-w-md">
          You don't have permission to view this section. Contact your administrator for access.
        </p>
      </div>
    );
  }

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      content: "",
      image_url: "",
      author: "",
    });
    setPreviewImage("");
    setEditingBlog(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openAddDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(blog: Blog) {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      description: blog.description || "",
      content: blog.content || "",
      image_url: blog.image_url || "",
      author: blog.author || "",
    });
    setPreviewImage(blog.image_url || "");
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Check permission - use editingBlog to determine if create or update
    const hasPermission = editingBlog 
      ? all.blogs.includes('update') 
      : all.blogs.includes('create');
    if (!hasPermission) {
      alert('You do not have permission to perform this action');
      return;
    }
    
    setSaving(true);

    try {
      const blogData = {
        title: formData.title,
        description: formData.description || null,
        content: formData.content || null,
        image_url: previewImage || formData.image_url || null,
        author: formData.author || null,
      };

      if (editingBlog) {
        const { error } = await supabase
          .from("blogs")
          .update(blogData)
          .eq("id", editingBlog.id);

        if (error) throw error;

        // ✅ Log audit event for updating blog
        await logAudit({
          action: AuditActions.UPDATE_BLOG,
          section: AuditSections.BLOG,
          details: `Updated blog: ${blogData.title}`,
          user_id: user?.id || '',
          user_email: user?.email || '',
        });
      } else {
        const { error } = await supabase.from("blogs").insert([blogData]);

        if (error) throw error;

        // ✅ Log audit event for creating blog
        await logAudit({
          action: AuditActions.CREATE_BLOG,
          section: AuditSections.BLOG,
          details: `Created blog: ${blogData.title}`,
          user_id: user?.id || '',
          user_email: user?.email || '',
        });
      }

      await fetchBlogs();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving blog:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    
    // Check permission
    if (!all.blogs.includes('delete')) {
      alert('You do not have permission to delete blog posts');
      return;
    }
    
    try {
      // Fetch blog title before deleting
      const { data: blog } = await supabase
        .from("blogs")
        .select('title')
        .eq("id", id)
        .single();

      const { error } = await supabase.from("blogs").delete().eq("id", id);
      
      if (error) throw error;

      // ✅ Log audit event for deleting blog
      await logAudit({
        action: AuditActions.DELETE_BLOG,
        section: AuditSections.BLOG,
        details: `Deleted blog: ${blog?.title || id}`,
        user_id: user?.id || '',
        user_email: user?.email || '',
      });
      
      fetchBlogs();
    } catch (error) {
      console.error("Error deleting blog:", error);
      alert("Failed to delete blog. Please try again.");
    }
  }

  // Sanitize filename to remove special characters that cause upload errors
  const sanitizeFileName = (name: string): string => {
    return name
      .normalize('NFD') // Decompose characters (é → e + accent)
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.\-]/g, '_'); // Replace invalid chars with underscores
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Verify session before upload
      const { session } = await safeGetSession();
      if (!session) {
        alert('Please log in to upload images');
        setUploading(false);
        return;
      }

      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${Date.now()}-${sanitizedName}`;
      
      const { data, error } = await supabase.storage
        .from('blogs')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('blogs')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;
      setPreviewImage(imageUrl);
      setFormData({ ...formData, image_url: imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setPreviewImage("");
    setFormData({ ...formData, image_url: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 mx-auto px-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            {all.blogs.includes('create') && (
              <Button onClick={openAddDialog} className="bg-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Blog Post
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBlog ? "Edit Blog Post" : "Add New Blog Post"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter blog title"
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="text-sm font-medium">Blog Image</label>
                {previewImage ? (
                  <div className="relative mt-2">
                    <Image 
                      src={previewImage} 
                      alt="Preview" 
                      width={800}
                      height={192}
                      className="w-full h-48 object-cover rounded-md"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="blog-image-upload"
                    />
                    <label
                      htmlFor="blog-image-upload"
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-md cursor-pointer hover:border-cyan-400 transition-colors"
                    >
                      <div className="text-center">
                        {uploading ? (
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-slate-400" />
                            <p className="text-sm text-slate-400 mt-2">Click to upload image</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Author */}
              <div>
                <label className="text-sm font-medium">Author</label>
                <Input
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  placeholder="Author name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium">Short Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description for the blog card"
                  rows={3}
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="text-sm font-medium">Full Content</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Write your blog content here..."
                  rows={10}
                />
              </div>

              <div className="text-right">
                <Button
                  type="submit"
                  className="bg-primary text-white"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="animate-spin" /> : "Save Blog Post"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Blog List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No blog posts yet.</p>
          <p className="text-sm">Click "Add Blog Post" to create your first post.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <div
              key={blog.id}
              className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition p-5 flex flex-col gap-4"
            >
              {/* Image */}
              {blog.image_url ? (
                <div className="h-40 rounded-lg overflow-hidden bg-gray-900">
                  <Image
                    src={blog.image_url}
                    alt={blog.title}
                    width={400}
                    height={160}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-40 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-white/50" />
                </div>
              )}

              {/* Title */}
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-2">
                  {blog.title}
                </h3>
              </div>

              {/* Description */}
              {blog.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {blog.description}
                </p>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {blog.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {blog.author}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(blog.created_at)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                {all.blogs.includes('update') && (
                  <button
                    onClick={() => openEditDialog(blog)}
                    className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {all.blogs.includes('delete') && (
                  <button
                    onClick={() => handleDelete(blog.id)}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
