"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  User,
  Folder,
} from "lucide-react";

interface Domain {
  id: string;
  name: string;
}

interface Freelancer {
  id: string;
  user_id: string | null;
  domain_id: string | null;
  display_name: string;
  title: string | null;
  bio: string | null;
  skills: string[];
  hourly_rate: number | null;
  completed_projects: number;
  location: string | null;
  is_available: boolean;
  domain?: Domain;
}

export default function FreelancersPage() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFreelancer, setEditingFreelancer] = useState<Freelancer | null>(null);

  const [formData, setFormData] = useState({
    display_name: "",
    title: "",
    bio: "",
    skills: "",
    hourly_rate: "",
    location: "",
    domain_id: "",
    is_available: true,
    completed_projects: 0,
  });

  const fetchDomains = useCallback(async () => {
    const { data } = await supabase
      .from("domains")
      .select("*")
      .order("name", { ascending: true });

    if (data) setDomains(data);
  }, []);

  const fetchFreelancers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("freelancers")
      .select("*, domain:domains(id, name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const parsedData = data.map((f: any) => ({
        ...f,
        skills: Array.isArray(f.skills) ? f.skills : [],
      }));
      setFreelancers(parsedData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDomains();
    fetchFreelancers();
  }, [fetchDomains, fetchFreelancers]);

  function resetForm() {
    setFormData({
      display_name: "",
      title: "",
      bio: "",
      skills: "",
      hourly_rate: "",
      location: "",
      domain_id: "",
      is_available: true,
      completed_projects: 0,
    });
    setEditingFreelancer(null);
  }

  function openAddDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(freelancer: Freelancer) {
    setEditingFreelancer(freelancer);
    setFormData({
      display_name: freelancer.display_name,
      title: freelancer.title || "",
      bio: freelancer.bio || "",
      skills: freelancer.skills.join(", "),
      hourly_rate: freelancer.hourly_rate?.toString() || "",
      location: freelancer.location || "",
      domain_id: freelancer.domain_id || "",
      is_available: freelancer.is_available,
      completed_projects: freelancer.completed_projects,
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const freelancerData = {
        display_name: formData.display_name,
        title: formData.title || null,
        bio: formData.bio || null,
        skills: skillsArray,
        hourly_rate: formData.hourly_rate
          ? parseFloat(formData.hourly_rate)
          : null,
        location: formData.location || null,
        domain_id: formData.domain_id || null,
        is_available: formData.is_available,
        completed_projects: formData.completed_projects,
      };

      if (editingFreelancer) {
        await supabase
          .from("freelancers")
          .update(freelancerData)
          .eq("id", editingFreelancer.id);
      } else {
        await supabase.from("freelancers").insert([freelancerData]);
      }

      await fetchFreelancers();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving freelancer:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this freelancer?")) return;

    await supabase.from("freelancers").delete().eq("id", id);
    fetchFreelancers();
  }

  return (
    <div className="space-y-6 mx-auto px-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Freelancers Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Freelancer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingFreelancer ? "Edit Freelancer" : "Add Freelancer"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Display Name *</label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Domain */}
              <div>
                <label className="text-sm font-medium">Domain</label>
                <select
                  className="input"
                  value={formData.domain_id}
                  onChange={(e) =>
                    setFormData({ ...formData, domain_id: e.target.value })
                  }
                >
                  <option value="">Select a domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skills */}
              <div>
                <label className="text-sm font-medium">
                  Skills (comma separated)
                </label>
                <Input
                  value={formData.skills}
                  onChange={(e) =>
                    setFormData({ ...formData, skills: e.target.value })
                  }
                />
              </div>

              {/* Location & Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
                <Input
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, hourly_rate: e.target.value })
                  }
                />
              </div>

              <div className="text-right">
                <Button
                  type="submit"
                  className="bg-primary text-white"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="animate-spin" /> : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : freelancers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No freelancers yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full table-auto">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-left">Freelancer</th>
                <th>Domain</th>
                <th>Title</th>
                <th>Skills</th>
                <th>Rate</th>
                <th>Projects</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {freelancers.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-medium">{f.display_name}</td>
                  <td className="p-4">
                    {f.domain ? (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Folder className="w-4 h-4" />
                        {f.domain.name}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-4">{f.title || "-"}</td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {f.skills.slice(0, 3).map((s, i) => (
                        <Badge key={i} className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">{f.hourly_rate ? `$${f.hourly_rate}` : "-"}</td>
                  <td className="p-4">{f.completed_projects}</td>
                  <td className="p-4">
                    <Badge className={f.is_available ? "bg-green-100" : "bg-gray-200"}>
                      {f.is_available ? "Available" : "Unavailable"}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button size="icon" onClick={() => openEditDialog(f)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}