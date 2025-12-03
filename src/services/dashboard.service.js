import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Group from "../models/Group.js";
import User from "../models/users/User.js";
import StudentProfile from "../models/users/StudentProfile.js";
import TeacherProfile from "../models/users/TeacherProfile.js";
import Assignment from "../models/Assignment.js";
import Feedback from "../models/Feedback.js";


export class DashboardService {

  /** Get teacher dashboard statistics
   * @param {string} teacherId - The teacher's user ID
   * @returns {object} Dashboard statistics
   */
  async getTeacherDashboard(teacherId) {
    // Get teacher profile for earnings
    const teacherProfile = await TeacherProfile.findOne({ user: teacherId });
    
    // Get all courses by this teacher
    const courses = await Course.find({ teacherId });
    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => c.status === 'published').length;

    // Get all groups by this teacher
    const groups = await Group.find({ teacherId });
    
    // Calculate total earnings from groups (non-free groups)
    const totalEarnings = groups.reduce((sum, group) => {
      if (!group.isFree && group.price) {
        return sum + (group.price * group.studentsCount);
      }
      return sum;
    }, 0);

    // Add teacher profile earnings if exists
    const earningsFromProfile = teacherProfile?.totalEarnings || 0;
    const totalEarningsCombined = totalEarnings + earningsFromProfile;

    // Get unique students across all groups
    const allStudentIds = new Set();
    groups.forEach(group => {
      group.students.forEach(studentId => {
        allStudentIds.add(studentId.toString());
      });
    });
    const totalStudents = allStudentIds.size;

    return {
      totalEarnings: totalEarningsCombined,
      totalStudents,
      totalCourses,
      activeCourses,
    };
  }

  /**
   * Get student dashboard statistics
   * @param {string} studentId - The student's user ID
   * @returns {object} Dashboard statistics
   */
  async getStudentDashboard(studentId) {
    // Get student profile
    const studentProfile = await StudentProfile.findOne({ user: studentId });
    if (!studentProfile) {
      throw new Error("Student profile not found");
    }

    // Get all enrollments for this student (enrollments are now group-based)
    const enrollments = await Enrollment.find({ student: studentId, status: 'active' })
      .populate({
        path: 'group',
        select: 'title courseId',
        populate: {
          path: 'courseId',
          select: 'title subject thumbnail',
          model: 'Course'
        }
      });
    
    const numberOfCourses = enrollments.length;

    // Get all assignments for this student (Assignment references StudentProfile._id)
    const assignments = await Assignment.find({ studentId: studentProfile._id });
    const totalAssignments = assignments.length;
    const submittedAssignments = assignments.filter(a => a.submitted).length;
    
    // Calculate marks rate (based on feedback ratings)
    const feedbacks = await Feedback.find({ studentId });
    const totalFeedbacks = feedbacks.length;
    const totalMarks = feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
    const marksRate = totalFeedbacks > 0 ? (totalMarks / (totalFeedbacks * 10)) * 100 : 0; // rating is 0-10, convert to percentage

    // Calculate attendance rate (based on submitted assignments vs total)
    // Assuming attendance = submitted assignments / total assignments
    const attendanceRate = totalAssignments > 0 
      ? (submittedAssignments / totalAssignments) * 100 
      : 0;

    // Calculate performance (combination of attendance and marks)
    const performance = (attendanceRate * 0.4 + marksRate * 0.6);

    return {
      numberOfCourses,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      marksRate: Math.round(marksRate * 100) / 100,
      performance: Math.round(performance * 100) / 100,
      courses: enrollments.map(e => ({
        id: e.group.courseId._id,
        title: e.group.courseId.title,
        subject: e.group.courseId.subject,
        thumbnail: e.group.courseId.thumbnail,
        groupId: e.group._id,
        groupTitle: e.group.title,
      })),
    };
  }

  /**
   * Get parent dashboard statistics
   * @param {string} parentId - The parent's user ID
   * @returns {object} Dashboard statistics
   */
  async getParentDashboard(parentId) {
    // Get all children (students) for this parent
    const childrenProfiles = await StudentProfile.find({ parent: parentId })
      .populate('user', 'name email avatar');
    
    const numberOfChildren = childrenProfiles.length;

    // Get all enrollments for all children (enrollments are now group-based)
    const childrenUserIds = childrenProfiles.map(cp => cp.user._id);
    const allEnrollments = await Enrollment.find({ 
      student: { $in: childrenUserIds },
      status: 'active'
    });

    const totalCourseSubscriptions = allEnrollments.length;

    // Calculate monthly paid (sum of group prices for children)
    const groups = await Group.find({ 
      students: { $in: childrenUserIds }
    });
    
    const monthlyPaid = groups.reduce((sum, group) => {
      if (!group.isFree && group.price) {
        return sum + group.price;
      }
      return sum;
    }, 0);

    // Get statistics for each child
    const childrenStats = await Promise.all(
      childrenProfiles.map(async (childProfile) => {
        const childUserId = childProfile.user._id;
        
        // Get enrollments for this child
        const childEnrollments = await Enrollment.find({ 
          student: childUserId, 
          status: 'active' 
        });
        const childNumberOfCourses = childEnrollments.length;

        // Get assignments for this child
        const childAssignments = await Assignment.find({ 
          studentId: childProfile._id 
        });
        const childTotalAssignments = childAssignments.length;
        const childSubmittedAssignments = childAssignments.filter(a => a.submitted).length;
        
        // Calculate attendance rate
        const childAttendanceRate = childTotalAssignments > 0
          ? (childSubmittedAssignments / childTotalAssignments) * 100
          : 0;

        // Calculate marks rate
        const childFeedbacks = await Feedback.find({ studentId: childUserId });
        const childTotalFeedbacks = childFeedbacks.length;
        const childTotalMarks = childFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
        const childMarksRate = childTotalFeedbacks > 0
          ? (childTotalMarks / (childTotalFeedbacks * 10)) * 100
          : 0;

        // Calculate performance
        const childPerformance = (childAttendanceRate * 0.4 + childMarksRate * 0.6);

        return {
          id: childProfile.user._id,
          name: childProfile.user.name,
          email: childProfile.user.email,
          avatar: childProfile.user.avatar,
          grade: childProfile.grade,
          numberOfCourses: childNumberOfCourses,
          attendanceRate: Math.round(childAttendanceRate * 100) / 100,
          marksRate: Math.round(childMarksRate * 100) / 100,
          performance: Math.round(childPerformance * 100) / 100,
        };
      })
    );

    return {
      numberOfChildren,
      totalCourseSubscriptions,
      monthlyPaid,
      children: childrenStats,
    };
  }

  /**
   * Get admin dashboard statistics
   * @returns {object} Dashboard statistics
   */
  async getAdminDashboard() {
    // Get all users grouped by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const usersStats = {
      total: await User.countDocuments(),
      byRole: {}
    };
    usersByRole.forEach(item => {
      usersStats.byRole[item._id] = item.count;
    });

    // Get courses statistics
    const coursesStats = {
      total: await Course.countDocuments(),
      byStatus: {}
    };
    
    const coursesByStatus = await Course.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    coursesByStatus.forEach(item => {
      coursesStats.byStatus[item._id] = item.count;
    });

    // Get enrollments statistics
    const enrollmentsStats = {
      total: await Enrollment.countDocuments(),
      byStatus: {}
    };
    
    const enrollmentsByStatus = await Enrollment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    enrollmentsByStatus.forEach(item => {
      enrollmentsStats.byStatus[item._id] = item.count;
    });

    // Get groups statistics
    const groupsStats = {
      total: await Group.countDocuments(),
      byStatus: {}
    };
    
    const groupsByStatus = await Group.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    groupsByStatus.forEach(item => {
      groupsStats.byStatus[item._id] = item.count;
    });

    // Calculate total revenue from groups
    const revenueData = await Group.aggregate([
      {
        $match: { isFree: false }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { 
            $sum: { 
              $multiply: ['$price', '$studentsCount'] 
            } 
          }
        }
      }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // Get teachers earnings
    const teachersEarnings = await TeacherProfile.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' },
          pendingPayouts: { $sum: '$pendingPayouts' }
        }
      }
    ]);
    const teachersTotalEarnings = teachersEarnings.length > 0 ? teachersEarnings[0].totalEarnings : 0;
    const teachersPendingPayouts = teachersEarnings.length > 0 ? teachersEarnings[0].pendingPayouts : 0;

    return {
      users: usersStats,
      courses: coursesStats,
      enrollments: enrollmentsStats,
      groups: groupsStats,
      revenue: {
        totalRevenue,
        teachersTotalEarnings,
        teachersPendingPayouts,
      },
    };
  }
}

export default new DashboardService();

