var _ = require('underscore');
_.str = require('underscore.string');

var pubsub = {
	/**
	* Subscribe to a handful of models in this collection
	*/
	subscribe: function (req, models) {
		if (!req.isSocket) return;
		var my = this;
		this.pluralize(models);

		// Subscribe to class room to hear about new models
		req.socket.join( my.classRoom() );
		sails.log.verbose("Subscribed to "+my.classRoom());

		// Subscribe to existing models
		var ids = _.pluck(models,'id');
		_.each(ids,function (id) {
			sails.log.verbose("Subscribed to "+my.room(id));
			req.socket.join( my.room(id) );
		});
	},

	/**
	* Unsubscribe from some models
	*/
	unsubscribe: function (req,models) {
		if (!req.isSocket) return;
		var my = this;
		this.pluralize(models);

		// If no models provided, unsubscribe from the class room
		if (!models) req.socket.leave( my.classRoom() );
		else {
			var ids = _.pluck(models,'id');
			_.each(ids,function (id) {
				req.socket.leave( my.room(id) );
			});
		}
	},

	/**
	* Take all of the class room models and 'introduce' them to a new instance room
	* (good for when a new instance is created-- connecting sockets must subscribe to it)
	*/
	introduce: function (req, id) {
		var my = this;
		_.each(this.subscribers(),function (socket) {
			socket.join( my.room(id) );
		});
	},

	/**
	* Broadcast a message to sockets connected to the specified models
	*/
	publish: function (req,models,message) {
		if (!req.isSocket) return;
		var my = this;
		this.pluralize(models);

		// If no models provided, publish to the class room
		if (!models) {
			io.sockets['in']( my.classRoom() ).json.emit(message);
			// req.socket.broadcast.to( my.classRoom() ).json.send(message);
			sails.log.verbose("Published "+message+" to "+my.classRoom());
		}
		// Otherwise publish to each instance room
		else {
			var ids = _.pluck(models,'id');
			_.each(ids,function (id) {
				io.sockets['in']( my.room(id) ).json.emit(message);
				// req.socket.broadcast.to( my.room(id) ).json.send(message);
				sails.log.verbose("Published "+message+" to "+my.room(id));
			});
		}
	},

	// Check that models are a list, if not, make them a list
	pluralize: function (models) {
		if (!_.isArray(models)) {
			if (!_.isObject(models)) throw new Error("Trying to subscribe to invalid model(s)! "+models);
			else return models = [models];
		}
		else return models;
	},

	// Return the room name for an instance in this collection with the given id
	room: function (id) {
		return 'sails_c_'+this.identity+'_'+id;
	},

	classRoom: function () {
		return 'sails_c_create_'+this.identity;
	},

	// Return the set of sockets subscribed to this instance or class room
	subscribers: function (id) {
		var room = id ? this.room(id) : this.classRoom();
		return sails.io.sockets.clients(room);
	}
};

// Export logic
module.exports = pubsub;