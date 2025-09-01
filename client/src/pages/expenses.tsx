import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import ExpenseForm from "@/components/expenses/expense-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, Clock, Wallet, Eye, Edit, Trash2, Check, X } from "lucide-react";
import type { ExpenseWithUsers } from "@shared/schema";

export default function Expenses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [filters, setFilters] = useState({
    category: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ["/api/expenses", filters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filters,
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      });

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params.get(key)) {
          params.delete(key);
        }
      });

      const response = await fetch(`/api/expenses?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    retry: false,
  });

  const { data: expenseStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    select: (data) => data?.expenses,
    retry: false,
  });

  const updateExpenseStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PATCH', `/api/expenses/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update expense status",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleApproveExpense = (id: string) => {
    updateExpenseStatusMutation.mutate({ id, status: 'approved' });
  };

  const handleRejectExpense = (id: string) => {
    updateExpenseStatusMutation.mutate({ id, status: 'rejected' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marketing':
        return 'bg-purple-100 text-purple-800';
      case 'shipping':
        return 'bg-blue-100 text-blue-800';
      case 'packaging':
        return 'bg-green-100 text-green-800';
      case 'office':
        return 'bg-orange-100 text-orange-800';
      case 'travel':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canApproveExpenses = user?.role === 'admin' || user?.role === 'manager';

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <Header title="Expense Management" subtitle="Track and manage your business expenses" />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const expenses = expensesData?.expenses || [];
  const totalExpenses = expensesData?.total || 0;
  const stats = expenseStats || {};

  return (
    <div className="flex-1 overflow-hidden">
      <Header title="Expense Management" subtitle="Track and manage your business expenses" />
      <div className="flex-1 overflow-auto p-6">
        {/* Expense Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Expenses</p>
                  <p className="text-3xl font-semibold text-foreground" data-testid="text-monthly-expenses">
                    ₹{parseFloat(stats.monthlyExpenses || "0").toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                  <p className="text-3xl font-semibold text-foreground" data-testid="text-pending-approvals">
                    {stats.pendingApprovals || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget Remaining</p>
                  <p className="text-3xl font-semibold text-foreground" data-testid="text-budget-remaining">
                    ₹{parseFloat(stats.budgetRemaining || "0").toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Expense and Filters */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-foreground">Expense Management</h3>
          <Button 
            onClick={() => setShowExpenseForm(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-add-expense"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Expense Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger data-testid="filter-expense-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="office">Office Supplies</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger data-testid="filter-expense-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  data-testid="filter-expense-date-from"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  data-testid="filter-expense-date-to"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: ExpenseWithUsers) => (
                    <TableRow key={expense.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground" data-testid={`expense-description-${expense.id}`}>
                            {expense.description}
                          </div>
                          {expense.notes && (
                            <div className="text-sm text-muted-foreground" data-testid={`expense-notes-${expense.id}`}>
                              {expense.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(expense.category)} data-testid={`expense-category-${expense.id}`}>
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`expense-amount-${expense.id}`}>
                        ₹{parseFloat(expense.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.status)} data-testid={`expense-status-${expense.id}`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`expense-submitted-by-${expense.id}`}>
                          {expense.submittedByUser.firstName || expense.submittedByUser.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm" data-testid={`expense-date-${expense.id}`}>
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {canApproveExpenses && expense.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApproveExpense(expense.id)}
                                disabled={updateExpenseStatusMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                                data-testid={`button-approve-${expense.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectExpense(expense.id)}
                                disabled={updateExpenseStatusMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-reject-${expense.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" data-testid={`button-view-${expense.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${expense.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {expenses.length === 0 && (
              <div className="p-8 text-center text-muted-foreground" data-testid="text-no-expenses">
                No expenses found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>

        <ExpenseForm 
          open={showExpenseForm} 
          onClose={() => setShowExpenseForm(false)} 
        />
      </div>
    </div>
  );
}
