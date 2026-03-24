import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET - Fetch all contact submissions (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const isRead = searchParams.get("is_read"); // "true" | "false" | null

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userData?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access denied - Super Admin only" },
        { status: 403 }
      );
    }

    // Build query for contact_submissions
    let query = supabase
      .from("contact_submissions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by is_read if provided
    if (isRead === "true") {
      query = query.eq("is_read", true);
    } else if (isRead === "false") {
      query = query.eq("is_read", false);
    }

    const { data: submissions, error, count } = await query;

    if (error) {
      console.error("Error fetching contact submissions:", error);
      return NextResponse.json(
        { error: "Failed to fetch contact submissions" },
        { status: 500 }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    return NextResponse.json({
      submissions: submissions || [],
      total: count || 0,
      unread: unreadCount || 0,
      page,
      limit
    });
  } catch (error) {
    console.error("Error in GET /api/contact-submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update contact submission status or delete
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    const { data: adminData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (adminData?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access denied - Super Admin only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { submission_id, action, is_read } = body;

    if (!submission_id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: submission_id and action" },
        { status: 400 }
      );
    }

    if (action === "update_status") {
      if (typeof is_read !== "boolean") {
        return NextResponse.json(
          { error: "Invalid is_read value. Use true or false" },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("contact_submissions")
        .update({ is_read: is_read })
        .eq("id", submission_id);

      if (updateError) {
        console.error("Error updating submission:", updateError);
        return NextResponse.json(
          { error: "Failed to update submission" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: is_read ? "Marked as read" : "Marked as unread" });
    } 
    else if (action === "delete") {
      const { error: deleteError } = await supabase
        .from("contact_submissions")
        .delete()
        .eq("id", submission_id);

      if (deleteError) {
        console.error("Error deleting submission:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete submission" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Submission deleted successfully" });
    }
    else {
      return NextResponse.json(
        { error: "Invalid action. Use 'update_status' or 'delete'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in PUT /api/contact-submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new contact submission or send response (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    
    // Check if this is a send_response action (requires auth)
    const { action, submission_id, response } = body;
    
    if (action === "send_response") {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // Check if user is super_admin
      const { data: adminData } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      
      if (adminData?.role !== "super_admin") {
        return NextResponse.json(
          { error: "Access denied - Super Admin only" },
          { status: 403 }
        );
      }

      if (!submission_id || !response) {
        return NextResponse.json(
          { error: "Missing required fields: submission_id and response" },
          { status: 400 }
        );
      }

      // Get the original submission
      const { data: submission, error: fetchError } = await supabase
        .from("contact_submissions")
        .select("*")
        .eq("id", submission_id)
        .single();

      if (fetchError || !submission) {
        return NextResponse.json(
          { error: "Submission not found" },
          { status: 404 }
        );
      }

      // Get company email from system settings
      let companyEmail = "support@company.com";
      let companyName = "Support Team";
      try {
        const { data: settings } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "company_email")
          .single();
        if (settings?.value) companyEmail = settings.value;
        
        const { data: nameSettings } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "company_name")
          .single();
        if (nameSettings?.value) companyName = nameSettings.value;
      } catch (e) {
        console.log("Using default company settings");
      }

      // Build email content
      const emailSubject = "Response to your inquiry";
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${submission.name},</h2>
          <p>Thank you for reaching out. You submitted the following message:</p>
          <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #06b6d4; margin: 15px 0;">
            "${submission.message}"
          </blockquote>
          <p><strong>Our response:</strong></p>
          <p style="background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin: 15px 0;">
            "${response}"
          </p>
          <p>Best regards,<br/>${companyName}</p>
        </div>
      `;

      // For now, we'll log the email content and mark as responded
      // In production, integrate with an email service like Resend, SendGrid, etc.
      console.log("=== EMAIL TO BE SENT ===");
      console.log("To:", submission.email);
      console.log("From:", companyEmail);
      console.log("Subject:", emailSubject);
      console.log("Body:", emailHtml);
      console.log("=========================");

      // Update submission as responded and mark as read
      const { error: updateError } = await supabase
        .from("contact_submissions")
        .update({ 
          is_read: true,
          is_responded: true,
          responded_at: new Date().toISOString(),
          response_content: response
        })
        .eq("id", submission_id);

      if (updateError) {
        console.error("Error updating submission:", updateError);
        return NextResponse.json(
          { error: "Failed to update submission" },
          { status: 500 }
        );
      }

      // Log the response in audit logs
      try {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "contact_response_sent",
          details: JSON.stringify({
            submission_id,
            contact_email: submission.email,
            contact_name: submission.name,
            response_length: response.length
          })
        });
      } catch (logError) {
        console.error("Error logging audit:", logError);
      }

      return NextResponse.json({ 
        success: true, 
        message: "Response sent successfully" 
      });
    }

    // Original POST - Create a new contact submission (public endpoint)
    const { name, email, subject, phone, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Get current user if authenticated (optional)
    let userId = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (e) {
      // Not authenticated - continue as guest
    }

    // Insert contact submission (no user_id - table doesn't have this column)
    const { data: submission, error } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email,
        subject: subject || null,
        phone: phone || null,
        message,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating contact submission:", error);
      return NextResponse.json(
        { error: "Failed to submit contact form" },
        { status: 500 }
      );
    }

    // Create notification for admins
    try {
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .in("role", ["admin", "super_admin"]);

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: "contact",
          title: "New Contact Submission",
          message: `${name} submitted a contact form: ${subject || "No subject"}`,
          link: "/dashboard/contact-submissions"
        }));
        
        await supabase.from("notifications").insert(notifications);
      }
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Error in POST /api/contact-submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
