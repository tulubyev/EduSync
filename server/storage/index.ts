import { UserStorage } from "./UserStorage";
import { CourseStorage } from "./CourseStorage";
import { PlatformStorage } from "./PlatformStorage";
import { DeadlineStorage } from "./DeadlineStorage";
import { NoteStorage } from "./NoteStorage";
import { AdminStorage } from "./AdminStorage";
import type { IUserStorage, ICourseStorage, IPlatformStorage, IDeadlineStorage, INoteStorage, IAdminStorage } from "./types";

export interface IStorage extends IUserStorage, ICourseStorage, IPlatformStorage, IDeadlineStorage, INoteStorage, IAdminStorage {}

export class DatabaseStorage implements IStorage {
  private userStorage: UserStorage;
  private courseStorage: CourseStorage;
  private platformStorage: PlatformStorage;
  private deadlineStorage: DeadlineStorage;
  private noteStorage: NoteStorage;
  private adminStorage: AdminStorage;

  constructor() {
    this.userStorage = new UserStorage();
    this.courseStorage = new CourseStorage();
    this.platformStorage = new PlatformStorage();
    this.deadlineStorage = new DeadlineStorage();
    this.noteStorage = new NoteStorage();
    this.adminStorage = new AdminStorage();
  }

  // User methods
  getUser(...args: Parameters<UserStorage['getUser']>) { return this.userStorage.getUser(...args); }
  getUserByEmail(...args: Parameters<UserStorage['getUserByEmail']>) { return this.userStorage.getUserByEmail(...args); }
  getUserByPhone(...args: Parameters<UserStorage['getUserByPhone']>) { return this.userStorage.getUserByPhone(...args); }
  getUserByIdentifier(...args: Parameters<UserStorage['getUserByIdentifier']>) { return this.userStorage.getUserByIdentifier(...args); }
  createUser(...args: Parameters<UserStorage['createUser']>) { return this.userStorage.createUser(...args); }
  updateUser(...args: Parameters<UserStorage['updateUser']>) { return this.userStorage.updateUser(...args); }
  deleteUserData(...args: Parameters<UserStorage['deleteUserData']>) { return this.userStorage.deleteUserData(...args); }

  // Course methods
  getCourses(...args: Parameters<CourseStorage['getCourses']>) { return this.courseStorage.getCourses(...args); }
  getCourse(...args: Parameters<CourseStorage['getCourse']>) { return this.courseStorage.getCourse(...args); }
  createCourse(...args: Parameters<CourseStorage['createCourse']>) { return this.courseStorage.createCourse(...args); }
  updateCourse(...args: Parameters<CourseStorage['updateCourse']>) { return this.courseStorage.updateCourse(...args); }
  deleteCourse(...args: Parameters<CourseStorage['deleteCourse']>) { return this.courseStorage.deleteCourse(...args); }

  // Platform methods
  getPlatforms(...args: Parameters<PlatformStorage['getPlatforms']>) { return this.platformStorage.getPlatforms(...args); }
  getPlatform(...args: Parameters<PlatformStorage['getPlatform']>) { return this.platformStorage.getPlatform(...args); }
  createPlatform(...args: Parameters<PlatformStorage['createPlatform']>) { return this.platformStorage.createPlatform(...args); }

  // Deadline methods
  getDeadlines(...args: Parameters<DeadlineStorage['getDeadlines']>) { return this.deadlineStorage.getDeadlines(...args); }
  getDeadlinesByCourse(...args: Parameters<DeadlineStorage['getDeadlinesByCourse']>) { return this.deadlineStorage.getDeadlinesByCourse(...args); }
  getDeadline(...args: Parameters<DeadlineStorage['getDeadline']>) { return this.deadlineStorage.getDeadline(...args); }
  createDeadline(...args: Parameters<DeadlineStorage['createDeadline']>) { return this.deadlineStorage.createDeadline(...args); }
  updateDeadline(...args: Parameters<DeadlineStorage['updateDeadline']>) { return this.deadlineStorage.updateDeadline(...args); }
  deleteDeadline(...args: Parameters<DeadlineStorage['deleteDeadline']>) { return this.deadlineStorage.deleteDeadline(...args); }

  // Note methods
  getNotes(...args: Parameters<NoteStorage['getNotes']>) { return this.noteStorage.getNotes(...args); }
  getNotesByCourse(...args: Parameters<NoteStorage['getNotesByCourse']>) { return this.noteStorage.getNotesByCourse(...args); }
  getNote(...args: Parameters<NoteStorage['getNote']>) { return this.noteStorage.getNote(...args); }
  createNote(...args: Parameters<NoteStorage['createNote']>) { return this.noteStorage.createNote(...args); }
  updateNote(...args: Parameters<NoteStorage['updateNote']>) { return this.noteStorage.updateNote(...args); }
  deleteNote(...args: Parameters<NoteStorage['deleteNote']>) { return this.noteStorage.deleteNote(...args); }

  // Admin methods
  getAllUsers(...args: Parameters<AdminStorage['getAllUsers']>) { return this.adminStorage.getAllUsers(...args); }
  getTotalUsersCount(...args: Parameters<AdminStorage['getTotalUsersCount']>) { return this.adminStorage.getTotalUsersCount(...args); }
  getNewUsersCount(...args: Parameters<AdminStorage['getNewUsersCount']>) { return this.adminStorage.getNewUsersCount(...args); }
  updateUserByAdmin(...args: Parameters<AdminStorage['updateUserByAdmin']>) { return this.adminStorage.updateUserByAdmin(...args); }
  deleteUserByAdmin(...args: Parameters<AdminStorage['deleteUserByAdmin']>) { return this.adminStorage.deleteUserByAdmin(...args); }
}

export const storage = new DatabaseStorage();
export type { IUserStorage, ICourseStorage, IPlatformStorage, IDeadlineStorage, INoteStorage, IAdminStorage };
