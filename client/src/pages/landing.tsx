import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartLine, ShoppingCart, TrendingUp, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <ChartLine className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Master Order ERP
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Centralized order management across Amazon, Flipkart, Meesho, and your custom website. 
            Track orders, manage expenses, and gain insights with our comprehensive admin panel.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-3"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Multi-Platform Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage orders from Amazon, Flipkart, Meesho, and your website in one unified dashboard.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle>Expense Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track business expenses with approval workflows and detailed categorization.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle>Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Secure access control with admin, manager, and viewer roles for your team.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to streamline your order management?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of businesses using Master Order ERP to manage their e-commerce operations.
          </p>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login-secondary"
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
