import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  capabilities: [{
    type: String
  }],
  wallet: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  memory: [{
    type: {
      type: String,
      enum: ['user', 'agent', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

agentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Agent = mongoose.model('Agent', agentSchema); 