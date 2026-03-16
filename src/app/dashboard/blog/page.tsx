"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    image_url: "",
    author: "",
  });

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBlogs(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  function resetForm() {
    setFormData({
      title: "",
      description: "",
      content: "",
      image_url: "",
      author: "",
    });
    setEditingBlog(null);
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
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const blogData = {
        title: formData.title,
        description: formData.description || null,
        content: formData.content || null,
        image_url: formData.image_url || null,
        author: formData.author || null,
      };

      if (editingBlog) {
        await supabase
          .from("blogs")
          .update(blogData)
          .eq("id", editingBlog.id);
      } else {
        await supabase.from("blogs").insert([blogData]);
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

    await supabase.from("blogs").delete().eq("id", id);
    fetchBlogs();
  }

  return (
    <div className="space-y-6 mx-auto px-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Blog Post
            </Button>
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

              {/* Image URL */}
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                />
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
                  <img
                    src={blog.image_url}
                    alt={blog.title}
                    className="w-full h-full object-cover"
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
                <button
                  onClick={() => openEditDialog(blog)}
                  className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition flex items-center justify-center"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(blog.id)}
                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
