"use client";

import { createClient } from "@/lib/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Folder,
  Users,
} from "lucide-react";
import { IconSelector, getIconComponent } from "@/components/ui/icon-selector";

interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url?: string | null;
  freelancer_count: number;
  created_at?: string;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
  });
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});

  const supabase = createClient();

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("domains")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) setDomains(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function resetForm() {
    setFormData({ name: "", slug: "", description: "", icon: "" });
    setEditingDomain(null);
  }

  function openAddDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(domain: Domain) {
    setEditingDomain(domain);
    setFormData({
      name: domain.name,
      slug: domain.slug,
      description: domain.description || "",
      icon: domain.icon || "",
    });
    setIsDialogOpen(true);
  }

  function handleNameChange(name: string) {
    if (!editingDomain) {
      setFormData({ ...formData, name, slug: generateSlug(name) });
    } else {
      setFormData({ ...formData, name });
    }
  }

  function handleDescriptionChange(
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    let value = e.target.value.trim();
    // Limit to 100 characters
    if (value.length > 100) {
      value = value.substring(0, 100);
    }
    setFormData({ ...formData, description: value });
  }

  function toggleDescriptionExpansion(domainId: string) {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const domainData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        icon: formData.icon || null,
      };

      // Validate description length
      if (
        domainData.description &&
        domainData.description.length > 100
      ) {
        alert("Description must be 100 characters or less");
        setSaving(false);
        return;
      }

      if (editingDomain) {
        const { error } = await supabase
          .from("domains")
          .update(domainData)
          .eq("id", editingDomain.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("domains").insert([domainData]);
        if (error) throw error;
      }

      await fetchDomains();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving domain:", error);
      alert("Failed to save domain. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Are you sure you want to delete this domain? This may affect freelancers linked to it."
      )
    )
      return;
    try {
      const { error } = await supabase.from("domains").delete().eq("id", id);
      if (error) throw error;
      await fetchDomains();
    } catch (error) {
      console.error("Error deleting domain:", error);
      alert("Failed to delete domain. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Domain Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage service categories for freelancers
          </p>
        </div>

        {/* Add/Edit Domain Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDomain ? "Edit Domain" : "Add New Domain"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Domain Name *</label>
                <Input
                  placeholder="e.g., Web Development"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Slug *</label>
                <Input
                  placeholder="web-development"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier (e.g., /freelancers/web-development)
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe this domain..."
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>
                    {formData.description.length} / 100 characters
                  </span>
                  {formData.description.length > 100 && (
                    <span className="text-red-500">
                      (Maximum 100 characters)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum recommended length for best display
                </p>
              </div>

              {/* Icon Selector */}
              <IconSelector
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
              />

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-primary text-white">
                  {saving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingDomain ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Domains Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : domains.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((domain) => {
            const Icon = getIconComponent(domain.icon);
            const isExpanded = expandedDescriptions[domain.id] || false;
            return (
              <div
                key={domain.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-5 flex flex-col gap-4 min-h-[200px] flex-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {domain.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        /{domain.slug}
                      </p>
                    </div>
                  </div>

                  {/* Edit/Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditDialog(domain)}
                      className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(domain.id)}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {domain.description && (
                  <div className="flex-1">
                    <p
                      className={`text-sm text-muted-foreground mb-3 line-clamp-3 ${
                        isExpanded ? "line-clamp-none" : ""
                      }`}
                    >
                      {domain.description}
                    </p>
                    {domain.description.length > 100 && (
                      <button
                        onClick={() => toggleDescriptionExpansion(domain.id)}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Show less
                            <Pencil className="w-3 h-3 rotate-180" />
                          </>
                        ) : (
                          <>
                            Read more
                            <Pencil className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {domain.freelancer_count || 0} Freelancers
                </Badge>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No domains available yet.</p>
          <p className="text-sm">
            Click "Add Domain" to create your first service category.
          </p>
        </div>
      )}
    </div>
  );
}