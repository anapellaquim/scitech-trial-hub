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
import { 
  Users, Shield, Plus, History, FileText,
  ClipboardEdit, Stethoscope, Search as SearchIcon, Database, Crown, 
  Settings, Heart, BarChart3, ShieldCheck,
  Briefcase, UserCheck, Scale, BadgeCheck, DollarSign, Eye
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserRoleDialog from "@/components/admin/UserRoleDialog";
import UserAuditDialog from "@/components/admin/UserAuditDialog";

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
  // Admin
  admin: { label: "Administrador", icon: ShieldCheck, color: "bg-red-500" },
  
  // Site Roles (S1, S2)
  site_coordinator: { label: "Coordenador (S1)", icon: ClipboardEdit, color: "bg-green-600" },
  investigator: { label: "Investigador (S2)", icon: Stethoscope, color: "bg-blue-600" },
  
  // Monitoring & Data (M1, D1, D2)
  cra_monitor: { label: "CRA/Monitor (M1)", icon: SearchIcon, color: "bg-orange-600" },
  data_manager: { label: "Gerente de Dados (D1)", icon: Database, color: "bg-purple-500" },
  data_lead: { label: "Líder de Dados (D2)", icon: Crown, color: "bg-purple-700" },
  
  // Administration (A1)
  study_builder: { label: "Study Builder (A1)", icon: Settings, color: "bg-slate-600" },
  
  // Oversight (O1, O2, O3)
  medical_monitor: { label: "Monitor Médico (O1)", icon: Heart, color: "bg-red-600" },
  statistician: { label: "Estatístico (O2)", icon: BarChart3, color: "bg-indigo-500" },
  auditor: { label: "Auditor (O3)", icon: Shield, color: "bg-amber-500" },
  
  // Legacy roles
  project_manager: { label: "Gerente de Projeto", icon: Briefcase, color: "bg-blue-500" },
  monitor: { label: "Monitor", icon: UserCheck, color: "bg-green-500" },
  regulatory: { label: "Regulatório", icon: Scale, color: "bg-orange-500" },
  quality: { label: "Qualidade", icon: BadgeCheck, color: "bg-teal-500" },
  finance: { label: "Financeiro", icon: DollarSign, color: "bg-yellow-500" },
  viewer: { label: "Visualizador", icon: Eye, color: "bg-gray-500" },
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    
    setCurrentUserId(session.user.id);
    
    // Verificar se o usuário é admin
    const { data: adminCheck } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin'
    });
    
    setIsAdmin(adminCheck || false);
    
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    
    if (profilesError) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    setUsers(profilesData || []);

    // Fetch all user roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("id, user_id, role, project_id, granted_at, expires_at, notes, granted_by")
      .order("granted_at", { ascending: false });

    // Group roles by user
    const rolesByUser: Record<string, UserRole[]> = {};
    (rolesData || []).forEach(role => {
      if (!rolesByUser[role.user_id]) {
        rolesByUser[role.user_id] = [];
      }
      rolesByUser[role.user_id].push(role);
    });
    setUserRoles(rolesByUser);

    // Fetch projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, title")
      .order("title");
    setProjects(projectsData || []);

    setLoading(false);
  };

  const handleAddRole = (user: Profile) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleViewAudit = (user: Profile) => {
    setSelectedUser(user);
    setAuditDialogOpen(true);
  };

  const handleRoleSuccess = () => {
    setRoleDialogOpen(false);
    fetchData();
  };

  const handleDeleteRole = async (roleId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);

    if (error) {
      toast.error("Erro ao remover papel");
    } else {
      toast.success("Papel removido com sucesso");
      fetchData();
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string, projectId?: string | null) => {
    const config = roleConfig[role] || { label: role, icon: Shield, color: "bg-gray-500" };
    const Icon = config.icon;
    
    let scope = "Global";
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      scope = project ? project.title : "Projeto específico";
    }

    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        {projectId && (
          <span className="text-xs text-muted-foreground">({scope})</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CTMSNav />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
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
              <h1 className="text-2xl font-bold text-foreground">Administração de Usuários</h1>
              <p className="text-muted-foreground">Gerencie papéis e permissões dos usuários</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ver Audit Trail
            </Link>
          </Button>
        </div>

        {!isAdmin && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="flex items-center gap-3 py-4">
              <Shield className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Você não possui permissões de administrador. Algumas funcionalidades podem estar limitadas.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Matriz de Papéis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lista de Usuários</CardTitle>
                    <CardDescription>
                      {users.length} usuários cadastrados no sistema
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Papéis</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              {user.id === currentUserId && (
                                <Badge variant="secondary" className="text-xs">Você</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {userRoles[user.id]?.map((role) => (
                              <div key={role.id} className="group flex items-center gap-1">
                                {getRoleBadge(role.role, role.project_id)}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteRole(role.id)}
                                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            )) || (
                              <span className="text-muted-foreground text-sm">Sem papéis atribuídos</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddRole(user)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Papel
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewAudit(user)}
                            >
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
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Matriz de Permissões</CardTitle>
                <CardDescription>
                  Visão geral dos papéis e permissões por módulo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Módulo</TableHead>
                        {Object.entries(roleConfig).map(([key, config]) => (
                          <TableHead key={key} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <config.icon className="h-4 w-4" />
                              <span className="text-xs">{config.label.split(" ")[0]}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { module: "Dashboard", permissions: ["full", "full", "read", "read", "read", "read", "read", "read"] },
                        { module: "Estudos", permissions: ["full", "full", "read", "read", "read", "read", "read", "read"] },
                        { module: "Visitas", permissions: ["full", "full", "full", "read", "read", "full", "read", "read"] },
                        { module: "EDC", permissions: ["full", "read", "read", "full", "read", "full", "read", "read"] },
                        { module: "eTMF", permissions: ["full", "full", "upload", "read", "full", "full", "read", "read"] },
                        { module: "Regulatório", permissions: ["full", "read", "read", "read", "full", "read", "read", "read"] },
                        { module: "Pagamentos", permissions: ["full", "read", "read", "read", "read", "read", "full", "read"] },
                        { module: "Usuários", permissions: ["full", "read", "-", "-", "-", "-", "-", "-"] },
                      ].map((row) => (
                        <TableRow key={row.module}>
                          <TableCell className="font-medium">{row.module}</TableCell>
                          {row.permissions.map((perm, idx) => (
                            <TableCell key={idx} className="text-center">
                              <Badge
                                variant={
                                  perm === "full" ? "default" :
                                  perm === "read" ? "secondary" :
                                  perm === "upload" ? "outline" : "destructive"
                                }
                                className="text-xs"
                              >
                                {perm === "full" ? "Total" :
                                 perm === "read" ? "Leitura" :
                                 perm === "upload" ? "Upload" : "—"}
                              </Badge>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedUser && (
        <>
          <UserRoleDialog
            open={roleDialogOpen}
            onOpenChange={setRoleDialogOpen}
            user={selectedUser}
            projects={projects}
            studies={[]}
            onSuccess={handleRoleSuccess}
          />
          <UserAuditDialog
            open={auditDialogOpen}
            onOpenChange={setAuditDialogOpen}
            user={selectedUser}
          />
        </>
      )}
    </div>
  );
};

export default AdminUsers;
