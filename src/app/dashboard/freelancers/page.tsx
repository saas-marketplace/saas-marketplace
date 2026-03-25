"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
// Centralized permissions - loads once at app level
import { usePermissions } from "@/stores/permissions-context";
import { useSuspended } from "@/components/ui/suspended-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  User,
  Folder,
  MapPin,
  AlertTriangle,
  Upload,
  X,
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
  description: string | null;
  skills: string[];
  avatar_url: string | null;
  completed_projects: number;
  experience_level: string | null;
  location: string | null;
  is_available: boolean;
  domain?: Domain;
}

export default function FreelancersPage() {
  // Centralized permissions - no duplicate API calls
  const { isLoading: permsLoading, isSuperAdmin, all } = usePermissions();
  const { isSuspended, isRestored } = useSuspended();

  const isLoading = permsLoading || isSuspended;
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFreelancer, setEditingFreelancer] = useState<Freelancer | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null); // For filtering
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // Guard to prevent duplicate fetches in React StrictMode
  const fetchDataRef = useRef(false);
  const isFetchingRef = useRef(false); // Track ongoing fetches

  const [formData, setFormData] = useState({
    display_name: "",
    title: "",
    bio: "",
    description: "",
    skills: "",
    avatar_url: "",
    location: "",
    domain_id: "",
    is_available: true,
    completed_projects: 0,
    experience_level: "",
  });

  const fetchData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    
    // Only use ref guard for initial mount, not for subsequent refreshes
    const isInitialFetch = !fetchDataRef.current;
    if (isInitialFetch) {
      fetchDataRef.current = true;
    }
    
    isFetchingRef.current = true;
    
    setLoading(true);
    try {
      const [domainsResult, freelancersResult, reviewsResult] = await Promise.all([
        supabase.from("domains").select("*").order("name", { ascending: true }),
        supabase.from("freelancers").select("*, domain:domains(id, name)").order("created_at", { ascending: false }),
        supabase.from("reviews").select("freelancer_id, rating")
      ]);

      setDomains(domainsResult.data || []);

      if (freelancersResult.data && !freelancersResult.error) {
        const parsedData = freelancersResult.data.map((f: any) => {
          const freelancerReviews = (reviewsResult.data || []).filter((r: any) => r.freelancer_id === f.id);
          if (freelancerReviews.length > 0) {
            const totalRating = freelancerReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
            f.rating = totalRating / freelancerReviews.length;
            f.review_count = freelancerReviews.length;
          }
          return {
            ...f,
            skills: Array.isArray(f.skills) ? f.skills : [],
          };
        });
        setFreelancers(parsedData);
      }
    } catch (error) {
      console.error("Error fetching freelancers data:", error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [supabase]);

  // Parallel data fetching - no more sequential loads
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Now safe to do early returns - all hooks have been called
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // Early returns removed - SuspendedContent overlay handles isSuspended/isRemoved/permissions

  function resetForm() {
    setFormData({
      display_name: "",
      title: "",
      bio: "",
      description: "",
      skills: "",
      avatar_url: "",
      location: "",
      domain_id: "",
      is_available: true,
      completed_projects: 0,
      experience_level: "",
    });
    setEditingFreelancer(null);
    setAvatarPreview("");
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
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
      description: freelancer.description || "",
      skills: freelancer.skills.join(", "),
      avatar_url: freelancer.avatar_url || "",
      location: freelancer.location || "",
      domain_id: freelancer.domain_id || "",
      is_available: freelancer.is_available,
      completed_projects: freelancer.completed_projects,
      experience_level: freelancer.experience_level || "",
    });
    setAvatarPreview(freelancer.avatar_url || "");
    setIsDialogOpen(true);
  }

  // Sanitize filename to remove special characters that cause upload errors
  const sanitizeFileName = (name: string): string => {
    return name
      .normalize('NFD') // Decompose characters (é → e + accent)
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9.\-]/g, '_'); // Replace invalid chars with underscores
  };

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `freelancers/${Date.now()}-${sanitizedName}`;
      
      const { data, error } = await supabase.storage
        .from('freelancers')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('freelancers')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;
      setAvatarPreview(imageUrl);
      setFormData({ ...formData, avatar_url: imageUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  }

  function removeAvatar() {
    setAvatarPreview("");
    setFormData({ ...formData, avatar_url: "" });
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Check permission - use editingFreelancer to determine if create or update
    const hasPermission = editingFreelancer 
      ? all.freelancers.includes('update') 
      : all.freelancers.includes('create');
    if (!hasPermission) {
      alert('You do not have permission to perform this action');
      return;
    }
    
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
        description: formData.description || null,
        skills: skillsArray,
        avatar_url: formData.avatar_url || null,
        location: formData.location || null,
        domain_id: formData.domain_id || null,
        is_available: formData.is_available,
        completed_projects: formData.completed_projects,
        experience_level: formData.experience_level || null,
      };

      if (editingFreelancer) {
        await supabase
          .from("freelancers")
          .update(freelancerData)
          .eq("id", editingFreelancer.id);
      } else {
        await supabase.from("freelancers").insert([freelancerData]);
      }

      await fetchData();
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
    
    // Check permission
    if (!all.freelancers.includes('delete')) {
      alert('You do not have permission to delete freelancers');
      return;
    }
    
    await supabase.from("freelancers").delete().eq("id", id);
    fetchData();
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter freelancers by selected domain
  const filteredFreelancers = selectedDomain 
    ? freelancers.filter(f => f.domain_id === selectedDomain)
    : freelancers;

  return (
    <div className="min-h-screen bg-white">
      <div className="space-y-6 mx-auto px-4 max-w-7xl py-8">
        {/* Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Freelancers Management</h1>
              <p className="text-muted-foreground mt-1">Manage your freelancer team</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                {all.freelancers.includes('create') && (
                  <Button 
                    onClick={openAddDialog}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Freelancer
                  </Button>
                )}
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingFreelancer ? "Edit Freelancer" : "Add Freelancer"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Personal Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-200">Display Name *</label>
                      <Input
                        value={formData.display_name}
                        onChange={(e) =>
                          setFormData({ ...formData, display_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-200">Title</label>
                      <Input
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Avatar Upload */}
                  <div>
                    <label className="text-sm font-medium text-slate-200">Avatar</label>
                    {avatarPreview ? (
                      <div className="relative mt-2 w-20 h-20">
                        <Image 
                          src={avatarPreview} 
                          alt="Avatar Preview" 
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-full object-cover border-2 border-purple-200"
                        />
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="freelancer-avatar-upload"
                        />
                        <label
                          htmlFor="freelancer-avatar-upload"
                          className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-slate-600 rounded-full cursor-pointer hover:border-cyan-400 transition-colors"
                        >
                          {uploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                          ) : (
                            <Upload className="w-6 h-6 text-slate-400" />
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-slate-200">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Brief description about the freelancer"
                    />
                  </div>

                  {/* Domain */}
                  <div>
                    <label className="text-sm font-medium text-slate-200">Domain</label>
                    <Select value={formData.domain_id} onValueChange={(value) => setFormData({ ...formData, domain_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="text-sm font-medium text-slate-200">
                      Skills (comma separated)
                    </label>
                    <Input
                      value={formData.skills}
                      onChange={(e) =>
                        setFormData({ ...formData, skills: e.target.value })
                      }
                    />
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="text-sm font-medium text-slate-200">Experience Level</label>
                    <Select value={formData.experience_level} onValueChange={(value) => setFormData({ ...formData, experience_level: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New Freelancer">New Freelancer</SelectItem>
                        <SelectItem value="1+ years experience">1+ years experience</SelectItem>
                        <SelectItem value="3+ years experience">3+ years experience</SelectItem>
                        <SelectItem value="5+ years experience">5+ years experience</SelectItem>
                        <SelectItem value="10+ years experience">10+ years experience</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location & Projects */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-200">Location</label>
                      <Input
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder="Location"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-200">Completed Projects</label>
                      <Input
                        type="number"
                        value={formData.completed_projects}
                        onChange={(e) =>
                          setFormData({ ...formData, completed_projects: parseInt(e.target.value) || 0 })
                        }
                        placeholder="Number of Projects"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <Button
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Domain Filter Bar */}
          {domains.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDomain(null)}
                className={selectedDomain === null 
                  ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600" 
                  : "bg-slate-800 hover:bg-slate-700 text-white border-slate-600"}
              >
                All Freelancers
              </Button>
              {domains.map((domain) => (
                <Button
                  key={domain.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDomain(domain.id)}
                  className={selectedDomain === domain.id 
                    ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600" 
                    : "bg-slate-800 hover:bg-slate-700 text-white border-slate-600"}
                >
                  {domain.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredFreelancers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No freelancers found.</p>
          {selectedDomain && (
            <p className="text-sm text-gray-500 mt-2">
              No freelancers in this domain. <button onClick={() => setSelectedDomain(null)} className="text-purple-600 underline">View all freelancers</button>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFreelancers.map((f) => (
            <div
              key={f.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-5 flex flex-col gap-4"
            >
              {/* Left Section - Avatar, Name, Title */}
              <div className="flex items-start gap-4">
                {f.avatar_url ? (
                  <Avatar className="w-12 h-12 border-2 border-purple-100">
                    <AvatarImage src={f.avatar_url} />
                    <AvatarFallback className="bg-purple-50 text-purple-600 font-semibold">
                      {getInitials(f.display_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(f.display_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {f.display_name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {f.title || "No title"}
                  </p>
                  {f.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      {f.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Section - Domain, Skills & Experience */}
              <div className="flex flex-col gap-3">
                {/* Experience Level */}
                {f.experience_level && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      {f.experience_level}
                    </span>
                  </div>
                )}

                {/* Domain */}
                {f.domain && (
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{f.domain.name}</span>
                  </div>
                )}

                {/* Skills Tags */}
                {f.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {f.skills.slice(0, 4).map((skill, index) => (
                      <span
                        key={index}
                        className="bg-purple-50 text-purple-600 text-xs px-3 py-1 rounded-full font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {f.skills.length > 4 && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
                        +{f.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Right Section - Projects, Status, Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Projects */}
                  <span className="text-sm text-gray-500">
                    {f.completed_projects} projects
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      f.is_available
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {f.is_available ? "Available" : "Unavailable"}
                  </span>

                  {/* Edit Button */}
                  {all.freelancers.includes('update') && (
                    <button
                      onClick={() => openEditDialog(f)}
                      className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Button */}
                  {all.freelancers.includes('delete') && (
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}