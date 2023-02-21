using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace vidosa.Models
{
    public class Post
    {
        [Key]
        public int Id { get; set; }
        public string PostKey { get; set; }
        public string Title { get; set; }
        public string Blurb { get; set; }
        public string Content { get; set; }
        public DateTime PusblishedDate { get; set; }
        public DateTime DateUpdated { get; set; }
        public string PostUrl { get; set; }
        public string ThumbUrl { get; set; }
        public string UserId { get; set; }

        public bool IsDeleted { get; set; }
    }

    public class Subject
    {
        public int Id { get; set; }
        public string SubjectId { get; set; }
        public string UserId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
    }

    public class Chapter
    {
        public int Id { get; set; }
        public string PostKey { get; set; }
        public string SubjectId { get; set; }
    }

    public class PostSEO
    {
        public int Id { get; set; }
        public string PostKey { get; set; }
        public string Title { get; set; }
        public string Blurb { get; set; }
        public string Keywords { get; set; }
    }

    [NotMapped]
    public class RelatedPostView
    {
        [ScaffoldColumn(false)]
        public int Id { get; set; }

        public string Title { get; set; }
        public bool IsRelated { get; set; }
    }

    public class RelatedPosts
    {
        [Key]
        public int Id { get; set; }
        public string Key { get; set; }
        public int Identity { get; set; }

        public bool IsPost { get; set; }
    }

    public enum CommentType
    {
        Post = 0,
        Video = 1
    }

    public class Comment
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public CommentType CommentType { get; set; }
        public string CommentId { get; set; }
        public string CommentKey { get; set; }
        public bool IsReply { get; set; }
        public DateTime DateTime { get; set; }
        public string UserId { get; set; }
        public virtual ApplicationUser User { get; set; }
    }

    public class CommentReply
    {
        public int Id { get; set; }
        public DateTime CommentDate { get; set; }
        public string CommentId { get; set; }
        public string ParentId { get; set; }
    }

    public class Redirect
    {
        [ScaffoldColumn(false)]
        public int Id { get; set; }
        
        public string UserId { get; set; }

        public string OldUrlId { get; set; }
        public string NewUrlId { get; set; }
        public string UrlIdFrom { get; set; }
        public string UrlIdTo { get; set; }

        public DateTime DateCreated { get; set; }
        public DateTime DateModified { get; set; }
    }
}