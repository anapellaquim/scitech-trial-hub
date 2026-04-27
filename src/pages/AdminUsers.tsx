import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import CTMSNav from "@/components/CTMSNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, Plus, History, FileText, Search as SearchIcon, ShieldCheck, Eye, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserRoleDialog from "@/components/admin/UserRoleDialog";
import UserAuditDialog from "@/components/admin/UserAuditDialog";
import ModulePermissionsDialog from "@/components/admin/ModulePermissionsDialog";

interface Profile {
  id: string;
  full_name: string;
  role: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  project_id: string | null;
  granted_at: string;
  expires_at: string | null;
  notes: string | null;
  granted_by: string | null;
}

interface Project {
  id: string;
  title: string;
}

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Administrator", icon: ShieldCheck, color: "bg-red-500" },
  viewer: { label: "Collaborator", icon: Eye, color: "bg-gray-500" },
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setCurrentUserId(session.user.id);
    const { data: adminCheck } = await supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
    setIsAdmin(adminCheck || false);
    if (!adminCheck) { navigate("/"); return; }
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: profilesData, error: profilesError } = await supabase.from("profiles").select("*").order("full_name");
    if (profilesError) { toast.error("Error loading users"); setLoading(false); return; }
    setUsers(profilesData || []);

    const { data: rolesData } = await supabase.from("user_roles").select("id, user_id, role, project_id, granted_at, expires_at, notes, granted_by").order("granted_at", { ascending: false });
    const rolesByUser: Record<string, UserRole[]> = {};
    (rolesData || []).forEach(role => {
      if (!rolesByUser[role.user_id]) rolesByUser[role.user_id] = [];
      rolesByUser[role.user_id].push(role);
    });
    setUserRoles(rolesByUser);

    const { data: projectsData } = await supabase.from("projects").select("id, title").order("title");
    setProjects(projectsData || []);
    setLoading(false);
  };

  const handleAddRole = (user: Profile) => { setSelectedUser(user); setRoleDialogOpen(true); };
  const handleViewAudit = (user: Profile) => { setSelectedUser(user); setAuditDialogOpen(true); };
  const handleRoleSuccess = () => { setRoleDialogOpen(false); fetchData(); };

  const handleDeleteRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) { toast.error("Error removing role"); } else { toast.success("Role removed successfully"); fetchData(); }
  };

  const filteredUsers = users.filter(user => user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getRoleBadge = (role: string, projectId?: string | null) => {
    const config = roleConfig[role] || { label: role, icon: Shield, color: "bg-gray-500" };
    const Icon = config.icon;
    let scope = "Global";
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      scope = project ? project.title : "Specific project";
    }
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        {projectId && <span className="text-xs text-muted-foreground">({scope})</span>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CTMSNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">User Administration</h1>
              <p className="text-muted-foreground">Manage user roles and permissions</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/settings/audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              View Audit Trail
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>{users.length} users registered</CardDescription>
              </div>
              <div className="relative w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{user.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          {user.id === currentUserId && <Badge variant="secondary" className="text-xs">You</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {userRoles[user.id]?.map((role) => (
                          <div key={role.id} className="group flex items-center gap-1">
                            {getRoleBadge(role.role, role.project_id)}
                            {isAdmin && (
                              <button onClick={() => handleDeleteRole(role.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity">×</button>
                            )}
                          </div>
                        )) || <span className="text-muted-foreground text-sm">No roles assigned</span>}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString("en-US")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <Button variant="outline" size="sm" onClick={() => handleAddRole(user)}>
                            <Plus className="h-4 w-4 mr-1" />Role
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleViewAudit(user)}>
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedUser && (
        <>
          <UserRoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} user={selectedUser} projects={projects} studies={[]} onSuccess={handleRoleSuccess} />
          <UserAuditDialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen} user={selectedUser} />
        </>
      )}
    </div>
  );
};

export default AdminUsers;
