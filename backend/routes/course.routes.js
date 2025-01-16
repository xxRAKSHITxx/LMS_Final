import { Router } from "express";
const router = Router();
import { 
    getAllCourses, 
    getLecturesByCourseId, 
    createCourse, 
    updateCourse, 
    removeCourse, 
    addLectureToCourseById, 
    deleteCourseLecture, 
    updateCourseLecture 
} from '../controllers/course.controller.js';
import { isLoggedIn, authorisedRoles, authorizeSubscriber } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

// Routes for courses
router.route('/')
    .get(getAllCourses)  // Public access, removed isLoggedIn
    .post(
        isLoggedIn, 
        authorisedRoles('ADMIN'), 
        upload.single("thumbnail"), 
        createCourse
    )  // Admin-only access with thumbnail upload
    .delete(deleteCourseLecture)  // Public access, removed isLoggedIn and admin protection
    .put(
        upload.single("lecture"), 
        updateCourseLecture
    ); // Public access, removed isLoggedIn and admin protection

// Routes for specific courses
router.route('/:id')
    .get(getLecturesByCourseId)  // Public access, removed isLoggedIn and authorizeSubscriber
    .put(
        isLoggedIn, 
        authorisedRoles("ADMIN"), 
        upload.single("thumbnail"), 
        updateCourse
    )  // Admin-only access with thumbnail upload
    .delete(
        isLoggedIn, 
        authorisedRoles('ADMIN'), 
        removeCourse
    )  // Admin-only access
    .post(
        isLoggedIn, 
        authorisedRoles("ADMIN"), 
        upload.single("lecture"), 
        addLectureToCourseById
    ); // Admin-only access with lecture upload

export default router;
