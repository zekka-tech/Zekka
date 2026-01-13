/**
 * Agent Zero - Export Module
 * Exports all Agent Zero roles and manager
 */

const AgentZeroManager = require('./manager');
const TeacherAgent = require('./teacher');
const TrainerAgent = require('./trainer');
const TutorAgent = require('./tutor');
const OptimizerAgent = require('./optimizer');
const MentorAgent = require('./mentor');
const ValidatorAgent = require('./validator');

module.exports = {
  AgentZeroManager,
  TeacherAgent,
  TrainerAgent,
  TutorAgent,
  OptimizerAgent,
  MentorAgent,
  ValidatorAgent
};
