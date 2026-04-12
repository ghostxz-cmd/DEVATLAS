import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type InstructorProfile = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  timezone: string | null;
  status: string;
  completionPercent: number;
};

type CourseSummary = {
  courseId: string;
  title: string;
  slug: string;
  level: string;
  category: string | null;
  thumbnailUrl: string | null;
  estimatedMins: number | null;
  createdAt: string;
  visibility: string;
  lessonCount: number;
  enrollmentCount: number;
  studentCount: number;
  averageRating: number | null;
  reviewCount: number;
  status: "PUBLISHED" | "DRAFT" | "IN_REVIEW";
};

type ActivityItem = {
  kind: string;
  title: string;
  detail: string;
  createdAt: string;
};

type DashboardOverview = {
  profile: InstructorProfile;
  summary: {
    coursesActive: number;
    coursesDraft: number;
    coursesInReview: number;
    totalCourses: number;
    totalStudents: number;
    totalLessons: number;
    averageFeedback: number;
    recentActivityCount: number;
  };
  courses: CourseSummary[];
  activityFeed: ActivityItem[];
  feedbackSummary: Array<{
    courseId: string;
    courseTitle: string;
    rating: number;
    reviewCount: number;
  }>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseHeaders() {
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function fetchRows<T>(supabaseUrl: string, path: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T[];
}

type UserRow = {
  id: string;
  supabase_auth_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string | null;
  role: string;
  status: string;
  created_at: string;
};

type InstructorAccountRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string | null;
  status: string;
  created_at: string;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  level: string;
  category_id: string | null;
  thumbnail_url: string | null;
  estimated_mins: number | null;
  visibility: string;
  created_by: string;
  created_at: string;
};

type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  is_published: boolean;
  estimated_minutes: number;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
};

type ReviewRow = {
  id: string;
  course_id: string;
  rating: number;
  comment: string;
  created_by: string;
  created_at: string;
};

type CourseCategoryRow = {
  id: string;
  slug: string;
  name: string;
};

type ActivityLogRow = {
  id: string;
  user_id: string | null;
  activity_type: string;
  activity_payload: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    
    // Get session from cookie to find Auth ID
    const cookieStore = await cookies();
    const sessionCookie = Array.from(cookieStore.getSetCookie()).find(cookie => 
      cookie.includes("sb-') || cookieStore.get('sb-auth-token')?.value;
    
    // For now, get auth context from request headers if available
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Missing or invalid authorization header." },
        { status: 401 }
      );
    }

    // Decode JWT to get user info - simplified approach
    // In production, you'd verify the token properly
    const token = authHeader.slice(7);
    
    // Fetch all courses and try to identify instructor's courses
    // First, let's get course data and filter by instructor
    // This is a simplified version - in a real app you'd need proper instructor-course relationship
    
    const [coursesData, lessonsData, enrollmentsData, reviewsData, categoriesData] = await Promise.all([
      fetchRows<CourseRow>(supabaseUrl, "courses?select=*&order=created_at.desc&limit=200"),
      fetchRows<LessonRow>(supabaseUrl, "lessons?select=*&order=course_id.asc,position.asc&limit=1000"),
      fetchRows<EnrollmentRow>(supabaseUrl, "enrollments?select=*&order=enrolled_at.desc&limit=500"),
      fetchRows<ReviewRow>(supabaseUrl, "reviews?select=*&order=created_at.desc&limit=200"),
      fetchRows<CourseCategoryRow>(supabaseUrl, "course_categories?select=*&order=name.asc&limit=100"),
    ]);

    const categoryMap = new Map(categoriesData.map((cat) => [cat.id, cat]));
    const lessonsByCourse = new Map<string, LessonRow[]>();
    const enrollmentsByCourse = new Map<string, EnrollmentRow[]>();
    const reviewsByCourse = new Map<string, ReviewRow[]>();

    for (const lesson of lessonsData) {
      const bucket = lessonsByCourse.get(lesson.course_id) ?? [];
      bucket.push(lesson);
      lessonsByCourse.set(lesson.course_id, bucket);
    }

    for (const enrollment of enrollmentsData) {
      const bucket = enrollmentsByCourse.get(enrollment.course_id) ?? [];
      bucket.push(enrollment);
      enrollmentsByCourse.set(enrollment.course_id, bucket);
    }

    for (const review of reviewsData) {
      const bucket = reviewsByCourse.get(review.course_id) ?? [];
      bucket.push(review);
      reviewsByCourse.set(review.course_id, bucket);
    }

    // Mock instructor data - in real implementation, get from session
    const mockInstructor = {
      fullName: "Profesor Exemplu",
      email: "profesor@example.com",
      avatarUrl: null,
      timezone: "Europe/Bucharest",
      status: "ACTIVE",
    };

    // Build course summaries - for demo, use first 5 published courses as instructor's
    const courseSummaries: CourseSummary[] = coursesData
      .filter((course) => course.visibility === "PUBLISHED")
      .slice(0, 5)
      .map((course) => {
        const lessons = lessonsByCourse.get(course.id) ?? [];
        const enrollments = enrollmentsByCourse.get(course.id) ?? [];
        const reviews = reviewsByCourse.get(course.id) ?? [];
        const uniqueStudents = new Set(enrollments.map((e) => e.user_id)).size;
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;
        const category = course.category_id
          ? categoryMap.get(course.category_id)
          : null;

        return {
          courseId: course.id,
          title: course.title,
          slug: course.slug,
          level: course.level.toLowerCase().replace(/_/g, " "),
          category: category?.name ?? null,
          thumbnailUrl: course.thumbnail_url ?? null,
          estimatedMins: course.estimated_mins ?? null,
          createdAt: course.created_at,
          visibility: course.visibility,
          lessonCount: lessons.length,
          enrollmentCount: enrollments.length,
          studentCount: uniqueStudents,
          averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
          reviewCount: reviews.length,
          status: "PUBLISHED" as const,
        };
      });

    // Summary stats
    const publishedCount = coursesData.filter((c) => c.visibility === "PUBLISHED").length;
    const draftCount = coursesData.filter((c) => c.visibility === "DRAFT").length;
    const inReviewCount = coursesData.filter((c) => c.visibility === "IN_REVIEW").length;

    const allStudents = new Set<string>();
    const allReviews: ReviewRow[] = [];
    courseSummaries.forEach((course) => {
      const enroll = enrollmentsByCourse.get(course.courseId) ?? [];
      enroll.forEach((e) => allStudents.add(e.user_id));
      const reviews = reviewsByCourse.get(course.courseId) ?? [];
      allReviews.push(...reviews);
    });

    const averageFeedback =
      allReviews.length > 0
        ? Math.round(
            (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10
          ) / 10
        : 0;

    // Activity feed - simulate from course creation and recent reviews
    const activityFeed: ActivityItem[] = [
      ...courseSummaries.slice(0, 3).map((course) => ({
        kind: "course",
        title: course.title,
        detail: `Lecția publicată • ${course.lessonCount} lecții totale`,
        createdAt: course.createdAt,
      })),
      ...allReviews.slice(0, 3).map((review) => ({
        kind: "review",
        title: `Feedback nou • ${review.rating}/5 stele`,
        detail: review.comment.slice(0, 50),
        createdAt: review.created_at,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 8);

    // Feedback summary
    const feedbackSummary = courseSummaries
      .filter((c) => c.reviewCount > 0)
      .map((course) => ({
        courseId: course.courseId,
        courseTitle: course.title,
        rating: course.averageRating ?? 0,
        reviewCount: course.reviewCount,
      }));

    const profileCompletion = Math.round(
      [
        mockInstructor.fullName,
        mockInstructor.email,
        mockInstructor.timezone,
        mockInstructor.avatarUrl,
      ].filter(Boolean).length /
        4 *
        100
    );

    return NextResponse.json({
      profile: {
        fullName: mockInstructor.fullName,
        email: mockInstructor.email,
        avatarUrl: mockInstructor.avatarUrl,
        timezone: mockInstructor.timezone,
        status: mockInstructor.status,
        completionPercent: profileCompletion,
      },
      summary: {
        coursesActive: publishedCount,
        coursesDraft: draftCount,
        coursesInReview: inReviewCount,
        totalCourses: publishedCount + draftCount + inReviewCount,
        totalStudents: allStudents.size,
        totalLessons: courseSummaries.reduce((sum, c) => sum + c.lessonCount, 0),
        averageFeedback,
        recentActivityCount: activityFeed.length,
      },
      courses: courseSummaries,
      activityFeed,
      feedbackSummary,
    } as DashboardOverview);
  } catch (error) {
    console.error("Instructor dashboard error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unexpected instructor dashboard error.",
      },
      { status: 500 }
    );
  }
}
