"use client";

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  User,
  Code,
  MapPin,
  DollarSign,
  Briefcase,
  Link as LinkIcon,
  Folder
} from 'lucide-react';

interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  freelancer_count: number;
}

interface Freelancer {
  id: string;
  user_id: string | null;
  domain_id: string | null;
  display_name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  skills: string[];
  hourly_rate: number | null;
  rating: number;
  review_count: number;
  portfolio_urls: string[];
  portfolio_images: string[];
  is_available: boolean;
  completed_projects: number;
  location: string | null;
  languages: string[];
  created_at?: string;
  domain?: Domain;
}

export default function FreelancersPage() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFreelancer, setEditingFreelancer] = useState<Freelancer | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    display_name: '',
    title: '',
    bio: '',
    skills: '',
    hourly_rate: '',
    location: '',
    portfolio_urls: '',
    domain_id: '',
    is_available: true,
    completed_projects: 0
  });

  const supabase = createClient();

  useEffect(() => {
    checkUser();
    fetchFreelancers();
    fetchDomains();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function fetchDomains() {
    const { data } = await supabase
      .from('domains')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) {
      setDomains(data);
    }
  }

  async function fetchFreelancers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('freelancers')
      .select('*, domain:domains(id, name, slug)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Parse skills and portfolio_urls from JSON strings if needed
      const parsedData = data.map((f: any) => ({
        ...f,
        skills: typeof f.skills === 'string' ? JSON.parse(f.skills) : (f.skills || []),
        portfolio_urls: typeof f.portfolio_urls === 'string' ? JSON.parse(f.portfolio_urls) : (f.portfolio_urls || [])
      }));
      setFreelancers(parsedData);
    }
    setLoading(false);
  }

  function resetForm() {
    setFormData({
      display_name: '',
      title: '',
      bio: '',
      skills: '',
      hourly_rate: '',
      location: '',
      portfolio_urls: '',
      domain_id: '',
      is_available: true,
      completed_projects: 0
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
      title: freelancer.title || '',
      bio: freelancer.bio || '',
      skills: Array.isArray(freelancer.skills) ? freelancer.skills.join(', ') : '',
      hourly_rate: freelancer.hourly_rate?.toString() || '',
      location: freelancer.location || '',
      portfolio_urls: Array.isArray(freelancer.portfolio_urls) ? freelancer.portfolio_urls.join(', ') : '',
      domain_id: freelancer.domain_id || '',
      is_available: freelancer.is_available,
      completed_projects: freelancer.completed_projects || 0
    });
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (!user) {
        alert('Please log in to add freelancers');
        setSaving(false);
        return;
      }

      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      const portfolioArray = formData.portfolio_urls.split(',').map(s => s.trim()).filter(Boolean);

      const freelancerData = {
        user_id: user.id,
        display_name: formData.display_name,
        title: formData.title || null,
        bio: formData.bio || null,
        skills: skillsArray,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        location: formData.location || null,
        portfolio_urls: portfolioArray,
        domain_id: formData.domain_id || null,
        is_available: formData.is_available,
        completed_projects: formData.completed_projects,
        rating: 0,
        review_count: 0
      };

      if (editingFreelancer) {
        const { error } = await supabase
          .from('freelancers')
          .update(freelancerData)
          .eq('id', editingFreelancer.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('freelancers')
          .insert([freelancerData]);

        if (error) throw error;
      }

      await fetchFreelancers();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving freelancer:', error);
      alert('Failed to save freelancer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this freelancer?')) return;

    try {
      const { error } = await supabase
        .from('freelancers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchFreelancers();
    } catch (error) {
      console.error('Error deleting freelancer:', error);
      alert('Failed to delete freelancer. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Freelancers Management</h1>
          <p className="text-muted-foreground">Manage your freelancer team</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="gradient-bg">
              <Plus className="w-4 h-4 mr-2" />
              Add Freelancer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFreelancer ? 'Edit Freelancer' : 'Add New Freelancer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name *</label>
                  <Input
                    placeholder="John Doe"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Full Stack Developer"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.domain_id}
                  onChange={(e) => setFormData({ ...formData, domain_id: e.target.value })}
                >
                  <option value="">Select a domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skills (comma separated)</label>
                  <Input
                    placeholder="React, Node.js, TypeScript"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="New York, USA"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hourly Rate ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="50.00"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Completed Projects</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.completed_projects}
                    onChange={(e) => setFormData({ ...formData, completed_projects: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio URLs (comma separated)</label>
                <Input
                  placeholder="https://portfolio1.com, https://github.com/user"
                  value={formData.portfolio_urls}
                  onChange={(e) => setFormData({ ...formData, portfolio_urls: e.target.value })}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_available" className="text-sm font-medium">
                  Available for work
                </label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="gradient-bg">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingFreelancer ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : freelancers.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Title</th>
                <th className="text-left py-3 px-4 font-medium">Skills</th>
                <th className="text-left py-3 px-4 font-medium">Rate</th>
                <th className="text-left py-3 px-4 font-medium">Projects</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {freelancers.map((freelancer) => (
                <tr key={freelancer.id} className="border-b">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-sm font-bold">
                        {freelancer.display_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{freelancer.display_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {freelancer.domain ? (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {freelancer.domain.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {freelancer.title || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(freelancer.skills) && freelancer.skills.slice(0, 2).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {Array.isArray(freelancer.skills) && freelancer.skills.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{freelancer.skills.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {freelancer.hourly_rate ? `$${freelancer.hourly_rate}/hr` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {freelancer.completed_projects || 0}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={freelancer.is_available ? 'default' : 'secondary'}>
                      {freelancer.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(freelancer)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(freelancer.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No freelancers available yet.</p>
          <p className="text-sm">Click "Add Freelancer" to create your first freelancer.</p>
        </div>
      )}
    </div>
  );
}
